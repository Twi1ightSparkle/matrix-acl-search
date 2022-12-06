/*
Search for blocked Matrix servers
Copyright (C) 2022  Twilight Sparkle

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

// Header
const stats1 = document.querySelector('#stats1');
const stats2 = document.querySelector('#stats2');

// Search form
const searchForm = document.querySelector('#searchForm');
const searchTerm = document.querySelector('#searchTerm');
const results = document.querySelector('#results');
const resultList = document.getElementById('resultList');

// Fetch ACL lists form
const aclForm = document.querySelector('#aclForm');
const serverUrl = document.querySelector('#serverUrl');
const accessToken = document.querySelector('#accessToken');
const isAdmin = document.querySelector('#isAdmin');
const roomList = document.querySelector('#roomList');
const aclResult = document.querySelector('#aclResult');

function s(n) {
    return n === 1 ? '' : 's';
}

// Load config and count servers on page load
window.onload = function () {
    const servers = JSON.parse(localStorage.getItem('servers'));
    const config = JSON.parse(localStorage.getItem('config'));
    const updated = localStorage.getItem('serversUpdated');

    if (config) {
        serverUrl.value = config.serverUrl;
        accessToken.value = config.accessToken;
        isAdmin.checked = config.isAdmin;
        roomList.value = config.roomList;
    }

    if (servers) {
        stats1.textContent = `${servers.length} server${s(servers.length)} loaded`;
        stats2.textContent = `Last updated ${updated}`;
    } else {
        stats1.textContent = 'No servers in LocalStorage. Please fetch them below';
    }
};

// Search servers stored in LocalStorage
searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    resultList.innerHTML = '';
    const servers = JSON.parse(localStorage.getItem('servers'));

    if (servers) {
        const res = servers.filter((server) => server.includes(searchTerm.value));
        const resCount = res.length;
        results.textContent = `Found ${resCount} server${s(resCount)} matching "${searchTerm.value}"`;
        if (resCount > 0) {
            res.forEach((r) => {
                const li = document.createElement('li');
                li.appendChild(document.createTextNode(r));
                resultList.appendChild(li);
            });
        }
    }
});

// Get blocked servers from the state of a room
async function getState(room) {
    const serverSet = new Set();

    const headers = { Authorization: `Bearer ${accessToken.value}` };
    const baseUrl = `https://${serverUrl.value}/${
        isAdmin.checked ? '_synapse/admin/v1/rooms' : '_matrix/client/r0/rooms'
    }`;

    const res = await fetch(`${baseUrl}/${room}/state`, {
        method: 'GET',
        headers,
    });

    const response = await res.json();
    const state = isAdmin.checked ? response.state : response;

    state.forEach(function (stateItem) {
        if (stateItem.type === 'm.room.rule.server') {
            const server = stateItem.content?.entity || stateItem.state_key.replace('rule:', '');
            serverSet.add(server.toLowerCase());
        } else if (stateItem.type === 'm.room.server_acl') {
            stateItem.content?.deny?.forEach((server) => {
                serverSet.add(server.toLowerCase());
            });
        }
    });
    return serverSet;
}

// Query Matrix rooms
aclForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const rooms = roomList.value.split('\n');

    aclResult.textContent = `Fetching servers from ${rooms.length} room${s(rooms.length)} using ${serverUrl.value}`;

    // Work with a set as it's values are unique
    let servers = new Set();
    for (const room of rooms) {
        if (room.length > 0) {
            let s = await getState(room);
            servers = new Set([...servers, ...s]);
        }
    }

    // Convert to an array
    servers = [...servers];

    localStorage.setItem('servers', JSON.stringify(servers));
    const now = new Date();
    localStorage.setItem('serversUpdated', String(now.toISOString()));

    aclResult.textContent = `${servers.length} server${s(servers.length)} fetched from ${rooms.length} room${s(
        servers.length,
    )}`;
    if (servers) {
        stats1.textContent = `${servers.length} server${s(servers.length)} loaded`;
        stats2.textContent = `Last updated ${now.toISOString()}`;
    } else {
        stats1.textContent = 'No servers in LocalStorage. Please fetch them below';
    }
});

function saveSettings() {
    const config = JSON.stringify({
        serverUrl: serverUrl.value,
        accessToken: accessToken.value,
        isAdmin: isAdmin.checked,
        roomList: roomList.value,
    });
    localStorage.setItem('config', config);
    aclResult.textContent = 'Settings saved';
}

function clearForm() {
    serverUrl.value = '';
    accessToken.value = '';
    isAdmin.checked = false;
    roomList.value = '';
}

function clearStorage() {
    if (confirm('Are you sure you want to clear LocalStorage? This action cannot be undone')) {
        clearForm();
        localStorage.clear();
        aclResult.textContent = 'LocalStorage erased';
        stats1.textContent = 'No servers in LocalStorage. Please fetch them below';
        stats2.textContent = '';
    }
}

window.onload = function () {
    document.querySelector('#current-url').textContent = window.location.host;
};
