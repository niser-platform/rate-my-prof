import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://fulqaphmvgtmgoawlovu.supabase.co"
const supabaseKey = "sb_publishable_1zL5QEXiKOOAUvUjtVIRig_4fQp_rPX"

export const supabase = createClient(supabaseUrl, supabaseKey)
