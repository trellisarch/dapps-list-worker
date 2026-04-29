// DAPPS_LIST_ADMIN_USER and DAPPS_LIST_ADMIN_PASSWORD will be provided via environment variables

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function htmlResponse(html, status = 200) {
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html' },
  });
}

function parseForm(body) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function unauthorizedResponse() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Dapps List Admin"' },
  });
}

function checkBasicAuth(request, env) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Basic ')) return false;
  try {
    const [, encoded] = auth.split(' ');
    const [user, pass] = atob(encoded).split(':');
    return user === env.DAPPS_LIST_ADMIN_USER && pass === env.DAPPS_LIST_ADMIN_PASSWORD;
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    // Check that DAPPS_LIST_ADMIN_USER and DAPPS_LIST_ADMIN_PASSWORD are set
    if (!env.DAPPS_LIST_ADMIN_USER || !env.DAPPS_LIST_ADMIN_PASSWORD) {
      return new Response('Server misconfiguration: DAPPS_LIST_ADMIN_USER and DAPPS_LIST_ADMIN_PASSWORD must be set as environment variables.', { status: 500 });
    }
    const url = new URL(request.url);
    if (url.pathname === '/list' && request.method === 'GET') {
      // Return dapp list as JSON from KV, grouped by category
      const listRaw = await env.DAPPS_LIST_KV.get('dapps');
      const dapps = listRaw ? JSON.parse(listRaw) : [];
      const highlighted = dapps.filter(dapp => !dapp.category || dapp.category === 'highlighted');
      const others = dapps.filter(dapp => dapp.category === 'others');
      return jsonResponse({ highlighted, others });
    }

    // Admin endpoints require Basic Auth
    if (url.pathname.startsWith('/admin')) {
      if (!checkBasicAuth(request, env)) {
        return unauthorizedResponse();
      }
    }

    if (url.pathname === '/admin' && request.method === 'GET') {
      // Admin HTML UI (dapps loaded from KV)
      const listRaw = await env.DAPPS_LIST_KV.get('dapps');
      const dapps = listRaw ? JSON.parse(listRaw) : [];
      // Check for edit query param
      const urlEditIdx = url.searchParams.get('edit');
      const editIdx = urlEditIdx !== null ? parseInt(urlEditIdx, 10) : null;
      const editDapp = editIdx !== null && dapps[editIdx] ? { ...dapps[editIdx], idx: editIdx } : null;
      return htmlResponse(`
        <html><head><title>Dapps List Admin</title>
        <style>
          body { background: #181c24; color: #e5e7eb; font-family: system-ui, sans-serif; margin: 0; }
          .container { max-width: 1200px; margin: 32px auto; background: #22252b; border-radius: 10px; padding: 28px 20px 20px 20px; box-shadow: 0 2px 12px #0004; }
          h1, h2 { color: #e5e7eb; margin-top: 0; }
          form { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px; }
          form input[type="text"] { background: #181c24; color: #e5e7eb; border: 1px solid #393c44; border-radius: 5px; padding: 7px 9px; }
          form button { background: #32343a; color: #e5e7eb; border: none; border-radius: 5px; padding: 8px 18px; font-weight: 500; cursor: pointer; }
          form button:hover { background: #44464c; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { padding: 10px 8px; border-bottom: 1px solid #2e3138; text-align: left; }
          th { background: #23252c; color: #bfc2c8; font-weight: 600; }
          tr:last-child td { border-bottom: none; }
          td form { display: inline; margin: 0; }
          td button { background: #2d2f33; color: #c7c9ce; padding: 5px 14px; border-radius: 4px; border: none; }
          td button:hover { background: #46484d; color: #fff; }
        </style>
        </head><body>
        <div class="container">
        <h1>Dapps List Admin</h1>
        ${editDapp ? `
        <div style="margin-bottom: 22px; padding: 16px; background: #23252c; border-radius: 8px;">
          <h2>Edit Dapp</h2>
          <form method="POST" action="/admin/edit">
            <input type="hidden" name="idx" value="${editDapp.idx}" />
            <input type="text" name="name" placeholder="Dapp name" value="${editDapp.name}" required />
            <input type="text" name="address" placeholder="Dapp address" value="${editDapp.address}" required />
            <input type="text" name="tags" placeholder="Tags (comma separated)" value="${(editDapp.tags || []).join(', ')}" />
<input type="text" name="dAppCategory" placeholder="dApp Category" value="${editDapp.dAppCategory || ''}" />
<select name="category">
              <option value="highlighted" ${!editDapp.category || editDapp.category === 'highlighted' ? 'selected' : ''}>Highlighted</option>
              <option value="others" ${editDapp.category === 'others' ? 'selected' : ''}>Others</option>
            </select>
            <button type="submit">Save</button>
            <a href="/admin" style="margin-left:10px; color:#bfc2c8;">Cancel</a>
          </form>
        </div>
        ` : `
        <form method="POST" action="/admin">
          <input type="text" name="name" placeholder="Dapp name" required />
          <input type="text" name="address" placeholder="Dapp address" required />
          <input type="text" name="tags" placeholder="Tags (comma-separated)" />
          <input type="text" name="dAppCategory" placeholder="dApp Category" />
          <select name="category" required style="background: #181c24; color: #e5e7eb; border: 1px solid #393c44; border-radius: 5px; padding: 7px 9px; margin-bottom: 10px;">
            <option value="highlighted">Highlighted</option>
            <option value="others">Others</option>
          </select>
          <button type="submit">Add Dapp</button>
        </form>
        `}
        <h2>Highlighted Dapps</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Tags</th>
              <th>dApp Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${dapps
              .map((dapp, idx) => ({...dapp, idx}))
              .filter(dapp => !dapp.category || dapp.category === 'highlighted')
              .map(
                dapp =>
                  `<tr>
                    <td>${dapp.name}</td>
                    <td>${dapp.address}</td>
                    <td>${(dapp.tags || []).join(", ")}</td>
                    <td>${dapp.dAppCategory || ''}</td>
                    <td>
                       <form method="POST" action="/admin/remove" style="display:inline">
                         <input type="hidden" name="idx" value="${dapp.idx}" />
                         <button type="submit" onclick="return confirm('Are you sure you want to remove this dapp?');">Remove</button>
                       </form>
                       <form method="GET" action="/admin" style="display:inline">
                         <input type="hidden" name="edit" value="${dapp.idx}" />
                         <button type="submit">Edit</button>
                       </form>
                     </td>
                  </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <h2>Other Dapps</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>Tags</th>
              <th>dApp Category</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${dapps
              .map((dapp, idx) => ({...dapp, idx}))
              .filter(dapp => dapp.category === 'others')
              .map(
                dapp =>
                  `<tr>
                    <td>${dapp.name}</td>
                    <td>${dapp.address}</td>
                    <td>${(dapp.tags || []).join(", ")}</td>
                    <td>${dapp.dAppCategory || ''}</td>
                    <td>
                       <form method="POST" action="/admin/remove" style="display:inline">
                         <input type="hidden" name="idx" value="${dapp.idx}" />
                         <button type="submit" onclick="return confirm('Are you sure you want to remove this dapp?');">Remove</button>
                       </form>
                       <form method="GET" action="/admin" style="display:inline">
                         <input type="hidden" name="edit" value="${dapp.idx}" />
                         <button type="submit">Edit</button>
                       </form>
                     </td>
                  </tr>`
              )
              .join('')}
          </tbody>
        </table>

        ${editDapp ? `
        <div style="margin-top: 32px; padding: 16px; background: #23252c; border-radius: 8px;">
          <h2>Edit Dapp</h2>
          <form method="POST" action="/admin/edit">
            <input type="hidden" name="idx" value="${editDapp.idx}" />
            <input type="text" name="name" placeholder="Dapp name" value="${editDapp.name}" required />
            <input type="text" name="address" placeholder="Dapp address" value="${editDapp.address}" required />
            <input type="text" name="tags" placeholder="Tags (comma separated)" value="${(editDapp.tags || []).join(', ')}" />
            <select name="category">
              <option value="highlighted" ${!editDapp.category || editDapp.category === 'highlighted' ? 'selected' : ''}>Highlighted</option>
              <option value="others" ${editDapp.category === 'others' ? 'selected' : ''}>Others</option>
            </select>
            <button type="submit">Save</button>
            <a href="/admin" style="margin-left:10px; color:#bfc2c8;">Cancel</a>
          </form>
        </div>
        ` : ''}

        </div>
        </body></html>
      `);
    }

    // Handle add dapp (admin)
    if (url.pathname === '/admin' && request.method === 'POST') {
      const form = await request.formData();
      const name = form.get('name');
      const address = form.get('address');
      const tags = form.get('tags');
      const dAppCategory = form.get('dAppCategory');
      let category = form.get('category');
      if (!name || !address) {
        return htmlResponse('<p>Missing fields</p><a href="/admin">Back</a>', 400);
      }
      if (!category) category = 'highlighted';
      // Load, update, and save dapps list in KV
      const listRaw = await env.DAPPS_LIST_KV.get('dapps');
      const dapps = listRaw ? JSON.parse(listRaw) : [];
      dapps.push({
        name,
        address,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        category,
        dAppCategory,
      });
      await env.DAPPS_LIST_KV.put('dapps', JSON.stringify(dapps));
      const location = new URL('/admin', request.url).toString();
      return Response.redirect(location, 302);
    }

    // Handle edit dapp (admin)
    if (url.pathname === '/admin/edit' && request.method === 'POST') {
      const form = await request.formData();
      const idx = form.get('idx');
      const name = form.get('name');
      const address = form.get('address');
      const tags = form.get('tags');
      const dAppCategory = form.get('dAppCategory');
      let category = form.get('category');
      if (!name || !address || idx === undefined) {
        return htmlResponse('<p>Missing fields</p><a href="/admin">Back</a>', 400);
      }
      if (!category) category = 'highlighted';
      const listRaw = await env.DAPPS_LIST_KV.get('dapps');
      const dapps = listRaw ? JSON.parse(listRaw) : [];
      if (dapps[idx]) {
        dapps[idx] = {
          name,
          address,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          category,
          dAppCategory,
        };
        await env.DAPPS_LIST_KV.put('dapps', JSON.stringify(dapps));
      }
      const location = new URL('/admin', request.url).toString();
      return Response.redirect(location, 302);
    }

    // Handle remove dapp (admin)
    if (url.pathname === '/admin/remove' && request.method === 'POST') {
      const form = await request.formData();
      const idx = form.get('idx');
      // Load, update, and save dapps list in KV
      const listRaw = await env.DAPPS_LIST_KV.get('dapps');
      const dapps = listRaw ? JSON.parse(listRaw) : [];
      if (idx !== undefined && dapps[idx]) {
        dapps.splice(idx, 1);
        await env.DAPPS_LIST_KV.put('dapps', JSON.stringify(dapps));
      }
      const location = new URL('/admin', request.url).toString();
      return Response.redirect(location, 302);
    }

    return new Response('Not found', { status: 404 });
  },
};
