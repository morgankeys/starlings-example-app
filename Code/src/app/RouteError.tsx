import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom';
import styles from './RouteError.module.css';

export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error';
  return (
    <main className={styles.page}>
      <h1>Something broke</h1>
      <p className={styles.message}>{message}</p>
      <Link to="/" className={styles.link}>
        Back to Home
      </Link>
    </main>
  );
}
