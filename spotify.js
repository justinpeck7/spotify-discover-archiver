const config = require('./config'),
    request = require('request'),
    Cron = require('cron').CronJob,
    jsonfile = require('jsonfile'),
    logStream = require('fs').createWriteStream(require('path').resolve(__dirname, 'log.txt'));

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

const update = () => {
    logStream.write('Starting...\n');
    getRefreshToken((error, response, body) => {
        const accessToken = body.access_token,
            options = {
                url: `https://api.spotify.com/v1/users/spotifydiscover/playlists/${config.discover_weekly}/tracks`,
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                },
                json: true
            };
        logStream.write(`Refresh Token returned with access token: ${!!accessToken}\n`);

        if (body.refresh_token) {
            const tokenData = jsonfile.readFileSync('config.json');
            tokenData.refresh_token = body.refresh_token;
            jsonfile.writeFileSync('config.json', tokenData);
        }

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

            logStream.write(`Discover tracks returned: ${!!body.items.length}\n`);

            request.post(archiveOptions, (error, response, body) => {
                if (body.snapshot_id) {
                    logStream.write(`Tracks added for: ${new Date()}\n`);
                }
                else {
                    logStream.write(`${body}\n`);
                }
            });
        });
    });
}

new Cron('0 0 10 * * 1', update, null, true);

