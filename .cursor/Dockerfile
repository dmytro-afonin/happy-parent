FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

RUN node --version && git --version && pnpm --version

# Official node image includes the `node` user (uid 1000). Cursor Cloud Agents
# expect a non-root runtime user for workspace installs and dev terminals.
USER node
WORKDIR /home/node
