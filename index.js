import core from '@actions/core';
import github from '@actions/github';
import fetch from 'node-fetch';

const MAX_MESSAGE_LENGTH = 72;

const formatDescription = (commits, size) => {
  let changelog = '';
  for (const i in commits) {
    if (i > 7) {
      changelog += `+ ${size - i} more...\n`;
      break;
    }

    const commit = commits[i];
    const sha = commit.id.substring(0, 6);
    const message =
      commit.message.length > MAX_MESSAGE_LENGTH
        ? commit.message.substring(0, MAX_MESSAGE_LENGTH) + '...'
        : commit.message;
    changelog += `[\`${sha}\`](${commit.url}) — ${message} ([\`${commit.author.username}\`](https://github.com/${commit.author.username}))\n`;
  }

  console.log('Changelog:', changelog);

  return changelog;
};

const run = async () => {
  const payload = github.context.payload;
  const pusher = payload.pusher.name;
  const repositoryName = payload.repository.name;
  const commits = payload.commits;
  const username = repositoryName.replace(/(discord)/gi, '******');
  const size = commits.length;
  const payloadUrl = payload.compare;

  console.log('Received payload...');

  console.log('Pusher:', pusher);
  console.log('Size:', size);
  console.log('Timestamp:', commits[0].timestamp);

  if (commits.length === 0) {
    console.log('No commits! Skipping...');
    return;
  }

  const webhook = core.getInput('webhook');
  const color = core.getInput('color');

  const requestBody = {
    embeds: [
      {
        description: formatDescription(commits, size),
        color: color,
        author: {
          name: `🚀 ${pusher} pushed ${size} commit${size === 1 ? '' : 's'}`,
          url: payloadUrl,
          icon_url: `https://github.com/${pusher}.png?size=64`,
        },
        timestamp: Date.parse(commits[0].timestamp),
      },
    ],
    username: username,
  };

  const url = `${webhook}?wait=true`;

  fetch(url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => res.json())
    .then((data) => core.info(JSON.stringify(data)))
    .catch((err) => core.info(err));
};

run()
  .then(() => {
    core.info('Action completed!');
  })
  .catch((error) => {
    core.setFailed(error.message);
  });
