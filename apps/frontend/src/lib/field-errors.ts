/** A form's error message per field. */
export type FieldErrors<F extends string> = Partial<Record<F, string>>;

/**
 * Maps a 400's details onto the form's fields. Paths are JSON pointers into the body, for example
 * `/name`. Undefined if any isn't one of `fields`, so the caller shows a general error instead.
 */
export function toFieldErrors<F extends string>(
  fields: readonly F[],
  details: { path: string; message: string }[],
): FieldErrors<F> | undefined {
  const errors: FieldErrors<F> = {};
  for (const { path, message } of details) {
    const field = fields.find((f) => path === `/${f}`);
    if (!field) return undefined;
    errors[field] = message;
  }
  return errors;
}
