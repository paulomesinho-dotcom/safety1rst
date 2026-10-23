import { NextRequest, NextResponse } from 'next/server';
import { decryptSecret } from '@/lib/server-crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { clientId, clientSecret, tenantId, siteUrl, path, action = 'list', folderId } = body;

        console.log('[SharePoint API] Request:', { action, siteUrl, hasSecret: !!clientSecret });

        if (!clientId || !clientSecret || !tenantId || !siteUrl) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const effectiveClientSecret = decryptSecret(clientSecret);

        // 1. Get Access Token (Client Credentials)
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'client_credentials');
        tokenParams.append('client_id', clientId);
        tokenParams.append('client_secret', effectiveClientSecret);
        tokenParams.append('scope', 'https://graph.microsoft.com/.default');

        const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: tokenParams
        });

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('[SharePoint API] Token Error:', err);
            return NextResponse.json({ error: 'Failed to authenticate with Microsoft', details: err }, { status: 401 });
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        // 2. Resolve Site ID (if not provided only siteUrl is known)
        // Parse Host and Path from URL
        // Example: https://contoso.sharepoint.com/sites/ProjectA
        const url = new URL(siteUrl);
        const host = url.hostname;
        const sitePath = url.pathname; // /sites/ProjectA

        // Graph API format: sites/{hostname}:{server-relative-path}
        // If path is '/', use sites/{hostname} (Root Site)
        // If path exists, use sites/{hostname}:{path}

        let graphSiteUrl = '';
        const cleanPath = sitePath === '/' ? '' : sitePath.replace(/\/$/, '');

        // Naive heuristic: If URL contains '/Shared Documents' or '/Forms', strip it to guess the site root
        // Many users paste the browser URL of a folder
        const commonJunk = ['/Shared Documents', '/Forms', '/Lists', '/_layouts', '/sitepages'];
        let smartPath = cleanPath;

        // Case-insensitive junk removal
        const lowerPath = smartPath.toLowerCase();
        for (const junk of commonJunk) {
            const idx = lowerPath.indexOf(junk.toLowerCase());
            if (idx !== -1) {
                smartPath = smartPath.substring(0, idx);
            }
        }

        // Remove trailing slash again after cleanup
        smartPath = smartPath.replace(/\/$/, '');

        if (!smartPath) {
            // Root Site
            graphSiteUrl = `https://graph.microsoft.com/v1.0/sites/${host}`;
        } else {
            // Subsite
            graphSiteUrl = `https://graph.microsoft.com/v1.0/sites/${host}:${smartPath}`;
        }

        console.log('[SharePoint API] Looking up site:', graphSiteUrl);

        const siteRes = await fetch(graphSiteUrl, {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!siteRes.ok) {
            const errText = await siteRes.text();
            console.error('[SharePoint API] Site LookUp Error:', errText);

            // detailed error for UI
            return NextResponse.json({
                error: `SharePoint Connection Failed. Checked URL: ${graphSiteUrl}. Graph Response: ${errText}`
            }, { status: 404 });
        }

        const siteData = await siteRes.json();
        const siteId = siteData.id;

        // 3. Handle Actions
        if (action === 'list') {
            // Get Default Drive (Documents Library)
            let queryUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`;

            // If specific folder ID is requested
            if (folderId && folderId !== 'root') {
                queryUrl = `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/items/${folderId}/children`;
            }

            const driveRes = await fetch(queryUrl, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (!driveRes.ok) {
                const err = await driveRes.text();
                return NextResponse.json({ error: 'Failed to list drive items', details: err }, { status: 500 });
            }

            const driveData = await driveRes.json();

            // Map to generic format
            const files = driveData.value.map((item: any) => ({
                id: item.id,
                name: item.name,
                mimeType: item.folder ? 'application/vnd.google-apps.folder' : item.file?.mimeType,
                webViewLink: item.webUrl,
                iconLink: null, // Graph doesn't provide generic icon links quite like Drive
                size: item.size
            }));

            return NextResponse.json({ files, siteId });
        }

        return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

    } catch (error: any) {
        console.error('[SharePoint API] Critical Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
