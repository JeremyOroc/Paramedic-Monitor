/**
 * Single authorization boundary for the scenario library.
 *
 * The current dev console has no account system, so access remains open to the
 * application route today. Future Supabase Auth admin-role enforcement belongs
 * here; the client and repository APIs will not need to change.
 */
export async function requireScenarioLibraryAccess(request: Request): Promise<void> {
  void request
}
