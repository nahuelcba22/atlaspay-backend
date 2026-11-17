    // Builds the SSL options for the Postgres connection.
// Certificate verification is on by default. It can only be disabled
// explicitly with DB_SSL_REJECT_UNAUTHORIZED=false (e.g. a self-signed
// certificate in a local environment).
export function buildSslOptions(
  rawValue: string | undefined,
): { require: true; rejectUnauthorized: boolean } {
  const value = rawValue?.trim().toLowerCase();

  if (value === undefined || value === '' || value === 'true') {
    return { require: true, rejectUnauthorized: true };
  }

  if (value === 'false') {
    console.warn(
      'DB_SSL_REJECT_UNAUTHORIZED=false: the database certificate is NOT verified.',
    );
    return { require: true, rejectUnauthorized: false };
  }

  throw new Error("DB_SSL_REJECT_UNAUTHORIZED debe ser 'true' o 'false'");
}