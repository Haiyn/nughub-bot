# Xenon the Antiquarian
> A Discord.js bot for managing RP things.

## Infrastructure

All bot components run on separate docker images managed by docker-compose. The bot itself is defined by a docker image from dockerhub.

A MongoDB stores data objects such as sessions, characters, qotds and more.

A Redis Cache offers configuration values and translation strings.

## Architecture

Internally, the bot uses inversify.js for Dependency Injection (DI). 

**Controllers** are the central distributing logic that handle different tasks in the bot at runtime. 

**Services** provide useful functions to the bot, mostly for repeating actions such as fetching a discord user.

**Providers** provide data such as configuration values from external systems or interface data for libraries.

**Models** provide the data structure and **Mappers** helps map them.

**Commands** are definitions and logic of commands which represent the interface to the user.

The starting point of the bot is the [index.ts](./src/index.ts) which starts up the bot. The [server.ts](./src/server.ts) starts the actual server and event subscribers.

### Naming Conventions

String and Emoji values in the database are in UPPER-KEBAB-CASE with dots (`.`) separating 
the categories. They are prefixed by a `STRINGS` or `EMOJIS` key prefix respectively:
```
// String
STRINGS.CATEGORY.ANOTHER-CATEGORY.LAST-CATEGORY

// Emoji
EMOJIS.CATEGORY.ANOTHER-CATEGORY.LAST-CATEGORY
```

Configuration values are in Pascal_CamelCase. They are prefixed by a `CONFIGURATION_` key prefix:
```
CONFIGURATION_SomeCategory_SomeConfigurationValue
```

## Development Setup
![node-shield]
![docker-shield]
![docker-compose-shield]
![mongodb-compass-shield]

<!-- Image Definitions -->
[docker-shield]: https://img.shields.io/badge/docker-v20.10.5-blue?style=flat&logo=docker
[docker-compose-shield]: https://img.shields.io/badge/docker--compose-v1.28.6-blue?style=flat&logo=docker
[node-shield]: https://img.shields.io/badge/node--lts-v16.6.0-blue?style=flat&logo=nodedotjs
[mongodb-compass-shield]: https://img.shields.io/badge/MongoDB--Compass-v1.28.4-blue?style=flat&logo=mongodb

### Setting up the base layer

1. Create an `.env` file in the root of the project with the following values:

```dotenv
# ORCHESTRATION
BOT_VERSION=[SemVer]
ENVIRONMENT=local

# SECRETS
TOKEN=[THE_BOT_TOKEN]

# MONGODB
MONGODB_CONNSTR=mongodb://xenon-user:dev-user@localhost:27017/xenon?authSource=admin
MONGODB_ROOT_USER=xenon-admin
MONGODB_ROOT_PASS=dev-admin
MONGODB_ROOT_NAME=admin
MONGODB_USER=xenon-user
MONGODB_PASS=dev-user
MONGODB_NAME=xenon

# REDIS
REDIS_CONNSTR=redis://default:dev@localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASS=dev

# CONFIGURATION
BOT_OWNER_ID=[YOUR_DISCORD_ID]
GUILD_ID=[GUILD_ID_WHERE_BOT_SHOULD_WORK]

# LOGGING
BASE_LOG_LEVEL=trace
SERVICE_LOG_LEVEL=trace
COMMAND_LOG_LEVEL=trace
PROVIDER_LOG_LEVEL=trace
IGNORE_STACK_LEVELS=6
```

**NOTE:** Setting your environment to local will **not** execute command definitions against the discord API. To register commands, use a different environment value once.


### Setting up the application layer

1. Install npm dependencies

```shell
npm install
```

2. Run the bot

```shell
npm run start
```

With Live Reload:
```shell
npm run watch
```

### Setting up the data layer
1. Run the databases 
   
```shell
docker-compose up -d xenon-mongodb xenon-redis
```

The MongoDB will be started with the authentication database `admin` that will contain the user `xenon-user` with the 
password `dev-user` (specified in the dotenv file). The user has read and write permissions on the `xenon` database (also 
specified in dotenv file).

2. Run RedisInsight

```shell
docker run -v redisinsight:/db -p 8001:8001 redislabs/redisinsight:latest
```

The redis database will be created with one default user, and the password specified in the dotenv file.

3. Connect to Redis database via RedisInsight
   
Open `localhost:8001` and connect to existing database with these values:

- **Host:** Host-IP (`ifconfig -a`)
- **Port:** 6379
- **Name:** xenon-redis
- **Username:** default
- **Password:** Value from `.env` file

4. Connect to MongoDB via MongoDB Compass

Enter the connection string from the dotenv file and connect.

## Data Management
### Managing Strings

To manage strings, either add them manually in RedisInsight or use the script in `orchestration/redis/import-strings.sh`. 

The script will only work on the local machine.
