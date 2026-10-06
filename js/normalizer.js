const regions = new Set(['northland','auckland','waikato','bay of plenty','gisborne','hawke’s bay',"hawke's bay",'taranaki','manawatu-whanganui','manawatū-whanganui','wellington','tasman','nelson','marlborough','west coast','canterbury','otago','southland']);
const aliases = new Map([['wanaka','Wānaka'],['taupo','Taupō'],['whangarei','Whangārei'],['otaki','Ōtaki']]);
const metros = ['Auckland','Christchurch','Wellington','Hamilton','Tauranga','Dunedin','Queenstown'];
export const aucklandSuburbs = new Set('albany|avondale|balmoral|beach haven|beachlands|belmont|birkdale|birkenhead|blockhouse bay|botany downs|browns bay|bucklands beach|devonport|east tamaki|east tāmaki|eden terrace|ellerslie|epsom|glen eden|glen innes|glenfield|glendowie|greenlane|grey lynn|henderson|herne bay|hobsonville|howick|kingsland|kohimarama|kumeu|kumeū|mangere|māngere|manukau|manurewa|milford|mission bay|mornington|mount albert|mount eden|mount roskill|mount wellington|new lynn|newmarket|northcote|onehunga|orewa|ōrewa|orakei|ōrākei|otahuhu|ōtāhuhu|otara|ōtara|pakuranga|panmure|papakura|papatoetoe|parnell|penrose|ponsonby|remuera|rosedale|royal oak|sandringham|silverdale|takapuna|te atatu|te atatū|titirangi|torbay|wairau valley|westgate|westmere|whangaparaoa|whangaparāoa|whenuapai'.split('|'));
export const chchSuburbs = new Set('addington|aranui|avondale|avonhead|avonside|beckenham|belfast|bishopdale|bromley|bryndwr|burnside|casebrook|cashmere|christchurch central|christchurch central city|edgeware|ferrymead|fendalton|halswell|harewood|hei hei|hoon hay|hornby|hornby south|ilam|islington|linwood|mairehau|merivale|mount pleasant|new brighton|northcote|opawa|papanui|parklands|redcliffs|redwood|riccarton|richmond|russley|saint albans|saint martins|shirley|sockburn|somerfield|spreydon|st albans|st martins|strowan|sumner|sydenham|templeton|upper riccarton|wainoni|waltham|wigram|woolston|yaldhurst'.split('|'));
export const wellingtonSuburbs = new Set('aro valley|berhampore|brooklyn|churton park|crofton downs|glenside|hataitai|island bay|johnsonville|karori|kelburn|khandallah|kilbirnie|lyall bay|miramar|mornington|mount cook|mount victoria|newtown|ngaio|ngauranga|northland|oriental bay|pipitea|rongotai|roseneath|seatoun|tawa|te aro|thorndon|wadestown|wellington central|wilton'.split('|'));
export const taurangaSuburbs = new Set('bethlehem|brookfield|gate pa|greerton|hairini|judea|matua|maungatapu|mount maunganui|mt maunganui|otumoetai|pāpāmoa|papamoa|papamoa beach|pyes pa|tauriko|welcome bay'.split('|'));
export const dunedinSuburbs = new Set('belleknowes|calton hill|caversham|central dunedin|concord|corstorphine|dunedin central|dunedin north|forbury|green island|halfway bush|helensburgh|kaikorai|kew|maori hill|māori hill|mornington|musselburgh|north east valley|ravensbourne|roslyn|saint clair|saint kilda|south dunedin|st clair|st kilda|wakari|waverley'.split('|'));
const suburbSets = [aucklandSuburbs,chchSuburbs,wellingtonSuburbs,new Set(),taurangaSuburbs,dunedinSuburbs,new Set(['arrowtown'])];
export function cleanLocationText(value) {
  let text = String(value ?? '').trim();
  if (/[ÃÂ]/.test(text)) {
    try { const bytes = Uint8Array.from(text, c => c.charCodeAt(0)); const repaired = new TextDecoder('utf-8', {fatal:true}).decode(bytes); if (!repaired.includes('�')) text = repaired; } catch {}
  }
  text = text.normalize('NFC').replace(/&amp;/gi, '&').replace(/\b\d{4}\b/g, '').replace(/\s+/g, ' ').replace(/^[\s,:;&]+|[\s,:;&]+$/g, '').trim();
  if (!text || !/\p{L}/u.test(text) || /^(null|undefined|other|new zealand|nz|0)$/i.test(text)) return '';
  return text;
}
function key(text) { return text.toLocaleLowerCase('en-NZ'); }
function pretty(text) {
  const alias = aliases.get(key(text));
  if (alias) return alias;
  return text.toLocaleLowerCase('en-NZ').replace(/(^|[\s-])\p{L}/gu, c => c.toLocaleUpperCase('en-NZ'));
}
export function normalizeCityTown(rawCity, rawAddress = '') {
  const parts = String(rawAddress ?? '').split(',').map(cleanLocationText).filter(Boolean);
  let city = cleanLocationText(rawCity);
  if (!city || regions.has(key(city))) city = [...parts].reverse().find(p => !regions.has(key(p)) && !/\d|\b(street|road|avenue|drive|highway|lane|shop|unit|suite)\b/i.test(p)) || '';
  if (!city) return 'Other';
  const addressCities = parts.filter(p => metros.some(m => key(p) === key(m)));
  if (addressCities.length) return metros.find(m => key(m) === key(addressCities[addressCities.length - 1]));
  const direct = metros.find(m => key(city) === key(m) || key(city) === key(m) + ' central' || key(city) === key(m) + ' cbd');
  if (direct) return direct;
  const candidates = suburbSets.flatMap((set, i) => set.has(key(city)) ? [metros[i]] : []);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const context = parts.map(key);
    if (context.includes('canterbury') && candidates.includes('Christchurch')) return 'Christchurch';
    if (context.includes('otago') && candidates.includes('Dunedin')) return 'Dunedin';
    if (context.includes('wellington') && candidates.includes('Wellington')) return 'Wellington';
    if (context.includes('auckland') && candidates.includes('Auckland')) return 'Auckland';
  }
  return pretty(city);
}
