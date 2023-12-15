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

  if (commits.length === 0) {
    console.log('No commits! Skipping...');
    return;
  }

  const webhook = core.getInput('webhook');
  const color = core.getInput('color');

  const embedMessage = {
    embeds: [
      {
        description: formatDescription(commits, size),
        color: color,
        author: {
          name: `⚡ ${pusher} pushed ${size} commit${size === 1 ? '' : 's'}`,
          url: payloadUrl,
          icon_url: `https://github.com/${pusher}.png?size=64`,
        },
        timestamp: Date.parse(commits[0].timestamp),
      },
    ],
    username: username,
  };

  // const embedMessage = {
  //   author: {
  //     name: `⚡ ${pusher} pushed ${size} commit${size === 1 ? '' : 's'}`,
  //     iconURL: `https://github.com/${pusher}.png?size=64`,
  //     url: payloadUrl,
  //   },
  //   color,
  //   description: formatDescription(commits, size),
  //   timestamp: Date.parse(commits[0].timestamp),
  // };

  const requestBody = {
    embeds: [embedMessage],
  };

  const url = `${webhook}?wait=true`;

  console.log(url);

  fetch(url, {
    method: 'POST',
    body: JSON.stringify(requestBody),
    headers: { 'Content-Type': 'application/json' },
  })
    .then((response) => response.json())
    .then((data) => core.info(JSON.stringify(data)))
    .catch((error) => core.info(error));
};

run()
  .then(() => {
    core.info('Action completed!');
  })
  .catch((error) => {
    core.setFailed(error.message);
  });
