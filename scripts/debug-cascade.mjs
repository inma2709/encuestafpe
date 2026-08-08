import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const supabase = createClient(
  env.PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function check() {
  // 1. Check CCAA options
  const { data: ccaaQ } = await supabase
    .from('questions')
    .select('id, code')
    .eq('code', 'demo_ccaa')
    .single();
  
  if (ccaaQ) {
    const { data: ccaaOpts } = await supabase
      .from('question_options')
      .select('id, code, label, region_id')
      .eq('question_id', ccaaQ.id)
      .order('position')
      .limit(3);
    console.log('\n=== CCAA Options (first 3) ===');
    console.log(JSON.stringify(ccaaOpts, null, 2));
  }

  // 2. Check Province options
  const { data: provQ } = await supabase
    .from('questions')
    .select('id, code')
    .eq('code', 'demo_province')
    .single();
  
  if (provQ) {
    const { data: provOpts } = await supabase
      .from('question_options')
      .select('id, code, label, region_id, province_id')
      .eq('question_id', provQ.id)
      .order('position')
      .limit(8);
    console.log('\n=== Province Options (first 8) ===');
    console.log(JSON.stringify(provOpts, null, 2));
  }

  // 3. Check provinces table for Andalucía
  const { data: andalucia } = await supabase
    .from('regions')
    .select('id, name, ine_code')
    .eq('ine_code', '01')
    .single();
  console.log('\n=== Andalucía Region ===');
  console.log(JSON.stringify(andalucia, null, 2));

  if (andalucia) {
    const { data: andaluciaProvinces } = await supabase
      .from('provinces')
      .select('id, name, ine_code, region_id')
      .eq('region_id', andalucia.id);
    console.log('\n=== Andalucía Provinces ===');
    console.log(JSON.stringify(andaluciaProvinces, null, 2));
  }

  // 4. Test the mapping logic
  const { data: provincesData } = await supabase
    .from('provinces')
    .select('id, region_id');
  
  const provinceRegionMap = new Map();
  (provincesData ?? []).forEach(p => {
    provinceRegionMap.set(p.id, p.region_id);
  });

  console.log('\n=== Province Region Map (sample) ===');
  console.log('Map size:', provinceRegionMap.size);
  const firstFive = Array.from(provinceRegionMap.entries()).slice(0, 5);
  console.log('First 5 entries:', firstFive);
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
