import { Hono } from 'hono';
import { html, raw } from 'hono/html';
import { SCENARIOS } from '../fixtures';
import type { MockStore } from '../store';

const SCRIPT = `
async function call(method, path, body) {
    const res = await fetch('/__mock' + path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) alert((await res.json()).error ?? res.status);
    location.reload();
}`;

export const dashboardRoutes = (store: MockStore) => {
    const app = new Hono();

    app.get('/', (c) => {
        const shops = [...store.shops.values()];
        return c.html(html`<!doctype html>
            <html>
                <head>
                    <title>Etsy mock</title>
                    <style>
                        body { font-family: sans-serif; margin: 1rem; }
                        table { border-collapse: collapse; margin-bottom: 1rem; }
                        td, th { border: 1px solid #ccc; padding: 0.25rem 0.5rem; text-align: left; }
                    </style>
                    <script>${raw(SCRIPT)}</script>
                </head>
                <body>
                    <h1>Etsy mock</h1>
                    <p>
                        <select id="scenario">${SCENARIOS.map((s) => html`<option>${s}</option>`)}</select>
                        <button onclick="call('POST', '/shops', { scenario: document.getElementById('scenario').value })">
                            New shop
                        </button>
                        <button onclick="call('POST', '/tokens/expire')">Expire tokens</button>
                        <button onclick="call('POST', '/faults', { method: 'POST', path: '/listings', status: 500 })">
                            Fail next push
                        </button>
                        <button onclick="if (confirm('Reset all mock data?')) call('POST', '/reset')">
                            Reset everything
                        </button>
                    </p>
                    ${shops.map((shop) => {
                        const listings = [...store.listings.values()].filter((l) => l.shopId === shop.shopId);
                        const receipts = [...store.receipts.values()].filter((r) => r.shopId === shop.shopId);
                        return html`<h2>${shop.shopName} <small>(shop ${shop.shopId})</small></h2>
                            <table>
                                <tr><th>Listing</th><th>Title</th><th>State</th><th>Qty</th><th>Price</th><th></th></tr>
                                ${listings.map(
                                    (l) => html`<tr>
                                        <td>${l.listingId}</td>
                                        <td>${l.title}</td>
                                        <td>${l.state}</td>
                                        <td>${store.listingQuantity(l)}</td>
                                        <td>£${(store.listingPriceAmount(l) / 100).toFixed(2)}</td>
                                        <td>
                                            <button onclick="call('POST', '/listings/${l.listingId}/state', { state: 'active' })">Publish</button>
                                            <button onclick="call('POST', '/listings/${l.listingId}/state', { state: 'inactive' })">Deactivate</button>
                                            <button onclick="call('POST', '/listings/${l.listingId}/state', { state: 'expired' })">Expire</button>
                                            <button ${l.state === 'active' ? '' : 'disabled'}
                                                onclick="call('POST', '/shops/${shop.shopId}/orders', { listingId: ${l.listingId}, quantity: 1 })">
                                                Sell 1
                                            </button>
                                        </td>
                                    </tr>`
                                )}
                            </table>
                            <p>${receipts.length} receipt(s), ${shop.transactionSoldCount} item(s) sold</p>`;
                    })}
                </body>
            </html>`);
    });

    return app;
};
