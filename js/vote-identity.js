const text=value=>value==null?'':String(value).trim();
export function resolveVoteIdentity(id,title,merchants=[]){
 const supplied=text(id)||text(title);
 const candidates=merchants.filter(m=>[m.id,m.seNumber,m.SENumber].some(value=>text(value)===supplied));
 const named=candidates.filter(m=>text(m.title||m.name||m.Name)===text(title));
 const matches=named.length?named:candidates;
 const canonicalOf=m=>text(m.seNumber)||text(m.SENumber)||text(m.id)||text(m.title||m.name||m.Name);
 if(matches.length&&new Set(matches.map(canonicalOf)).size!==1)throw new Error('Ambiguous voting identifier; reload or report this merchant.');
 const merchant=matches[0];
 if(!merchant)return{key:supplied,aliases:supplied?[supplied]:[]};
 const key=canonicalOf(merchant);
 const aliases=[...new Set([key,text(merchant.id),text(merchant.seNumber),text(merchant.SENumber)].filter(Boolean))].filter(alias=>!merchants.some(other=>other!==merchant&&[other.id,other.seNumber,other.SENumber].some(value=>text(value)===alias)&&canonicalOf(other)!==key));
 if(!aliases.includes(key))aliases.unshift(key);
 return{key,aliases};
}
