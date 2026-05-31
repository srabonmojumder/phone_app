const url = 'https://gkhqbsfybgkgnifxbktx.supabase.co/rest/v1/telegram_conf?select=*&limit=1';
const key = 'sb_publishable_jLiNgZkE8gaUq7OTv7XMJg_gYYQlDHh';
fetch(url, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
}).then(r => r.json()).then(console.log).catch(console.error);
