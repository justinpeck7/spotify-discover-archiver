const config = require('./config'),
    request = require('request')
schedule = require('node-schedule');

const getRefreshToken = (cb) => {
    const options = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': 'Basic ' + (Buffer.from(config.client_id + ':' + config.client_secret).toString('base64')) },
        form: {
            grant_type: 'refresh_token',
            refresh_token: config.refresh_token
        },
        json: true
    };

    request.post(options, (error, response, body) => {
        cb(error, response, body);
    });
}

//'0 0 2 * * 1'
const scheduled = schedule.scheduleJob('10 * * * * *', () => {
    getRefreshToken((error, response, body) => {
        const accessToken = body.access_token,
            options = {
                url: `https://api.spotify.com/v1/users/spotifydiscover/playlists/${config.discover_weekly}/tracks`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                json: true
            };
        request.get(options, (error, response, body) => {
            const discoverTracks = body.items.map((item) => item.track.uri).join(','),
                archiveOptions = {
                    url: `https://api.spotify.com/v1/users/${config.user_id}/playlists/${config.test_playlist}/tracks`,
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    },
                    qs: {
                        uris: discoverTracks
                    },
                    json: true
                };
            request.post(archiveOptions, (error, response, body) => {
                if (body.snapshot_id) {
                    console.log(`Tracks added for: ${new Date()}`);
                }
                else {
                    console.log(body);
                }
            });
        });
    });
});