// Meridian Outdoor Co.: the demo workspace. Profiles live in Docs/Personas/.
import type { Organization, Project, Team, User } from '@/domain/types';

export const org: Organization = {
  id: 'org_meridian',
  name: 'Meridian Outdoor Co.',
  domain: 'meridianoutdoor.com',
  plan: 'Business',
};

const person = (
  id: string,
  name: string,
  title: string,
  color: User['color'],
  location: string,
  role: User['role'] = 'member',
): User => ({
  id,
  name,
  title,
  color,
  location,
  role,
  status: 'active',
  email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@meridianoutdoor.com`,
});

export const users: User[] = [
  // Product Design
  person('u_maya', 'Maya Okafor', 'Product Design Lead', 'violet', 'Denver, CO'),
  person('u_leo', 'Leo Brandt', 'Senior Product Designer', 'sky', 'Denver, CO'),
  person('u_ines', 'Inés Carvalho', 'Product Designer', 'teal', 'Lisbon, PT'),
  person('u_sam', 'Sam Whitaker', 'UX Researcher', 'amber', 'Boulder, CO'),
  person('u_theo', 'Theo Nakamura', 'Content Designer', 'rust', 'Portland, OR'),
  // Engineering
  person('u_raj', 'Raj Patel', 'Engineering Manager', 'sky', 'Denver, CO'),
  person('u_chloe', 'Chloé Martin', 'Frontend Engineer', 'violet', 'Montréal, QC'),
  person('u_ben', 'Ben Adeyemi', 'Backend Engineer', 'teal', 'Denver, CO'),
  person('u_kira', 'Kira Sato', 'Full-stack Engineer', 'amber', 'Seattle, WA'),
  person('u_omar', 'Omar Haddad', 'QA Engineer', 'rust', 'Denver, CO'),
  // Marketing
  person('u_julia', 'Julia Romero', 'Marketing Director', 'amber', 'Denver, CO'),
  person('u_noah', 'Noah Fischer', 'Senior Copywriter', 'sky', 'Denver, CO'),
  person('u_ava', 'Ava Lindqvist', 'Brand & Photo Producer', 'violet', 'Salt Lake City, UT'),
  person('u_marcus', 'Marcus Bell', 'Growth Marketer', 'teal', 'Austin, TX'),
  // Operations
  person('u_dana', 'Dana Whitfield', 'Head of Operations', 'teal', 'Denver, CO', 'admin'),
  person('u_hugo', 'Hugo Lambert', 'Merchandising Planner', 'rust', 'Denver, CO'),
  person('u_priya', 'Priya Raman', 'Supplier Manager', 'violet', 'Denver, CO'),
  // Guest
  {
    id: 'u_elena',
    name: 'Elena Ruiz',
    title: 'Photographer',
    company: 'Northlight Studio',
    email: 'elena@northlightstudio.co',
    color: 'amber',
    location: 'Santa Fe, NM',
    role: 'guest',
    status: 'active',
  },
];

export const teams: Team[] = [
  {
    id: 'tm_design',
    name: 'Product Design',
    description: 'Designs the Meridian shopping experience, from browse to checkout.',
    color: 'violet',
    members: [
      { userId: 'u_maya', role: 'lead' },
      { userId: 'u_leo', role: 'member' },
      { userId: 'u_ines', role: 'member' },
      { userId: 'u_sam', role: 'member' },
      { userId: 'u_theo', role: 'member' },
    ],
  },
  {
    id: 'tm_eng',
    name: 'Engineering',
    description: 'Builds and runs meridianoutdoor.com and the internal tools behind it.',
    color: 'sky',
    members: [
      { userId: 'u_raj', role: 'lead' },
      { userId: 'u_chloe', role: 'member' },
      { userId: 'u_ben', role: 'member' },
      { userId: 'u_kira', role: 'member' },
      { userId: 'u_omar', role: 'member' },
    ],
  },
  {
    id: 'tm_marketing',
    name: 'Marketing',
    description: 'Catalog, campaigns, brand and growth.',
    color: 'amber',
    members: [
      { userId: 'u_julia', role: 'lead' },
      { userId: 'u_noah', role: 'member' },
      { userId: 'u_ava', role: 'member' },
      { userId: 'u_marcus', role: 'member' },
    ],
  },
  {
    id: 'tm_ops',
    name: 'Operations',
    description: 'Suppliers, inventory, freight and merchandising.',
    color: 'teal',
    members: [
      { userId: 'u_dana', role: 'lead' },
      { userId: 'u_hugo', role: 'member' },
      { userId: 'u_priya', role: 'member' },
    ],
  },
];

export const projects: Project[] = [
  {
    id: 'p_catalog',
    name: "Spring '27 Catalog",
    description:
      'The spring catalog and its launch on meridianoutdoor.com: photography, copy, page map and launch campaign.',
    teamId: 'tm_marketing',
    color: 'amber',
    folderId: 'fd_catalog',
  },
  {
    id: 'p_checkout',
    name: 'Checkout Redesign',
    description:
      'Cut checkout abandonment by simplifying the address, shipping and payment steps and adding guest checkout.',
    teamId: 'tm_design',
    color: 'violet',
    folderId: 'fd_checkout',
  },
  {
    id: 'p_supplier',
    name: 'Supplier Portal',
    description:
      'A self-serve portal for suppliers to onboard, update inventory and track purchase orders.',
    teamId: 'tm_ops',
    color: 'teal',
    folderId: 'fd_supplier',
  },
];
