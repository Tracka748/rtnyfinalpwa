import { NextRequest } from 'next/server'
import { CAPABILITIES, requireCapability } from '@/lib/authz'
import { createSupabaseAdmin } from '@/lib/supabase'
import { fail, mapDbError, ok, readJson } from '@/lib/catalog-api'
import { isUuid } from '@/lib/catalog-validation'
import { validateSaveDraft } from '@/lib/package-validation'

// The autosave endpoint. Content changes ONLY through theme_package_save_draft.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await requireCapability(request, CAPABILITIES.PACKAGES_MANAGE, 'allow')
  if (auth.error) return auth.response

  try {
    const { id, versionId } = await params
    if (!isUuid(id) || !isUuid(versionId)) return fail(400, 'Invalid id')

    const parsed = await readJson(request)
    if (!parsed.ok) return parsed.response
    const v = validateSaveDraft(parsed.body)
    if (!v.ok) return fail(400, v.error)

    const supabase = createSupabaseAdmin()
    const { data: owned, error: ownErr } = await supabase
      .from('theme_package_versions').select('id').eq('id', versionId).eq('package_id', id).maybeSingle()
    if (ownErr) return mapDbError(ownErr, 'draft PUT ownership')
    if (!owned) return fail(404, 'Package version not found')

    // p_actor is always the verified session user; the validator rejects any actor-like body key.
    const { data: revision, error } = await supabase.rpc('theme_package_save_draft', {
      p_version_id: versionId,
      p_actor: auth.userId,
      p_expected_revision: v.value.expected_revision,
      p_meta: v.value.meta ?? null,
      p_components: v.value.components ?? null,
    })
    if (error) return mapDbError(error, 'draft PUT') // RT409 -> 409, trigger/validation messages -> 400

    // The save already succeeded: if this read fails, still return the new revision so the
    // client does not retry with a stale one.
    const { data: row, error: readErr } = await supabase
      .from('theme_package_versions').select('updated_at').eq('id', versionId).maybeSingle()
    if (readErr || !row) console.error('[packages] draft PUT updated_at read failed', readErr?.code ?? '', readErr?.message ?? '')

    return ok({ revision, updated_at: row?.updated_at ?? null })
  } catch (err) {
    return mapDbError(err, 'draft PUT')
  }
}
