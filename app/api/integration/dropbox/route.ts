import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, code, appKey, appSecret, redirectUri, refreshToken, path } = body;

        // 1. Exchange Auth Code for Tokens
        if (action === 'exchange') {
            if (!code || !appKey || !appSecret || !redirectUri) {
                return NextResponse.json({ error: 'Missing parameters for exchange' }, { status: 400 });
            }

            const params = new URLSearchParams();
            params.append('code', code);
            params.append('grant_type', 'authorization_code');
            params.append('client_id', appKey);
            params.append('client_secret', appSecret);
            params.append('redirect_uri', redirectUri);

            const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            const data = await res.json();

            if (data.error) {
                console.error('Dropbox Auth Error:', data);
                return NextResponse.json({ error: data.error_description || 'Auth Failed' }, { status: 400 });
            }

            return NextResponse.json(data);
        }

        // 2. Refresh Token
        if (action === 'refresh') {
            if (!refreshToken || !appKey || !appSecret) {
                return NextResponse.json({ error: 'Missing parameters for refresh' }, { status: 400 });
            }

            const params = new URLSearchParams();
            params.append('grant_type', 'refresh_token');
            params.append('refresh_token', refreshToken);
            params.append('client_id', appKey);
            params.append('client_secret', appSecret);

            const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params
            });

            const data = await res.json();
            if (data.error) {
                console.error('Dropbox Refresh Error:', data);
                return NextResponse.json({ error: data.error_description || 'Refresh Failed' }, { status: 400 });
            }
            return NextResponse.json(data);
        }

        // 3. List Files
        if (action === 'list') {
            const { accessToken } = body;
            if (!accessToken) return NextResponse.json({ error: 'Missing Access Token' }, { status: 401 });

            // Dropbox 'list_folder'
            // Path must be "" for root, or "/Folder"
            let dbxPath = path || '';
            if (dbxPath === '/') dbxPath = ''; // Root is empty string in Dropbox API

            const response = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: dbxPath,
                    recursive: false,
                    include_media_info: false,
                    include_deleted: false,
                    include_has_explicit_shared_members: false,
                    include_mounted_folders: true
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                // Handle specific "path/not_found" error gracefully?
                return NextResponse.json({ error: 'Dropbox List Error', details: errText }, { status: response.status });
            }

            const data = await response.json();

            // Map to generic format
            const files = data.entries.map((item: any) => ({
                id: item.path_display, // Use Path as ID for easier navigation/creation/upload
                name: item.name,
                mimeType: item['.tag'] === 'folder' ? 'application/vnd.google-apps.folder' : (item.name.split('.').pop() || 'file'), // Return extension for icons
                webViewLink: item.path_display, // Use path as link/id mostly, web link requires separate call
                iconLink: null,
                size: item.size,
                createdTime: item.client_modified || item.server_modified // Add Date
            }));

            return NextResponse.json({ files, cursor: data.cursor, has_more: data.has_more });
        }

        // 4. Create Folder
        if (action === 'create_folder') {
            const { accessToken, path, name } = body;
            if (!accessToken || !name) return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });

            // Dropbox Create Folder
            // Path must be full path: /Parent/NewName
            let parentPath = path === 'root' || path === '/' || !path ? '' : path;
            const newFolderPath = `${parentPath}/${name}`;

            console.log(`Dropbox API: Creating folder '${newFolderPath}' with autorename=${body.autorename}`);

            const response = await fetch('https://api.dropboxapi.com/2/files/create_folder_v2', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: newFolderPath,
                    autorename: body.autorename !== undefined ? body.autorename : true
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json({ error: 'Create Folder Error', details: errText }, { status: response.status });
            }

            const data = await response.json();
            return NextResponse.json(data);
        }

        return NextResponse.json({ error: 'Invalid Action' }, { status: 400 });

    } catch (error: any) {
        console.error('Dropbox API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
