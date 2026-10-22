import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { orgApi, projectsApi, teamsApi, usersApi } from '@/api/endpoints';
import { keys } from '@/api/keys';
import type { AccentColor, NewMember, TeamRole, User, UserPatch } from '@/domain/types';

export const useUsers = () =>
  useQuery({ queryKey: keys.users, queryFn: usersApi.list, staleTime: 5 * 60_000 });

/** id → User, for rendering names and avatars anywhere. */
export function useUserMap(): Map<string, User> {
  const { data } = useUsers();
  return useMemo(() => new Map((data ?? []).map((u) => [u.id, u])), [data]);
}

export const useUser = (id: string) =>
  useQuery({ queryKey: keys.user(id), queryFn: () => usersApi.get(id) });

export const useTeams = (mine = false) =>
  useQuery({ queryKey: keys.teams(mine), queryFn: () => teamsApi.list(mine) });
export const useTeam = (id: string) =>
  useQuery({ queryKey: keys.team(id), queryFn: () => teamsApi.get(id) });

export const useProjects = () => useQuery({ queryKey: keys.projects, queryFn: projectsApi.list });
export const useProject = (id: string) =>
  useQuery({ queryKey: keys.project(id), queryFn: () => projectsApi.get(id) });

function useInvalidateTeams() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['teams'] });
    qc.invalidateQueries({ queryKey: keys.session });
  };
}

/** Admin changes touch people, their team memberships and the session (org name, own teams). */
function useInvalidateOrg() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: keys.session });
    qc.invalidateQueries({ queryKey: keys.users });
    qc.invalidateQueries({ queryKey: ['teams'] });
  };
}

/** Active people only: who can be assigned, shared with, @mentioned or added to a team. */
export function useActiveUsers() {
  const { data, ...rest } = useUsers();
  const active = useMemo(() => (data ?? []).filter((u) => u.status !== 'deactivated'), [data]);
  return { ...rest, data: active };
}

export function useUpdateOrg() {
  const invalidate = useInvalidateOrg();
  return useMutation({ mutationFn: orgApi.update, onSuccess: invalidate });
}

export function useInviteMember() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: (input: NewMember) => usersApi.invite(input),
    onSuccess: invalidate,
  });
}

export function useUpdateMember() {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UserPatch }) => usersApi.update(id, patch),
    onSuccess: invalidate,
  });
}

export function useCreateTeam() {
  const invalidate = useInvalidateTeams();
  return useMutation({
    mutationFn: (input: { name: string; description?: string; color?: AccentColor }) =>
      teamsApi.create(input),
    onSuccess: invalidate,
  });
}

export function useTeamMembership(teamId: string) {
  const invalidate = useInvalidateTeams();
  const add = useMutation({
    mutationFn: (userId: string) => teamsApi.addMember(teamId, userId),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (userId: string) => teamsApi.removeMember(teamId, userId),
    onSuccess: invalidate,
  });
  const setRole = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: TeamRole }) =>
      teamsApi.setRole(teamId, userId, role),
    onSuccess: invalidate,
  });
  return { add, remove, setRole };
}
