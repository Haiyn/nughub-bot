# Xenon the Antiquarian
> A Discord.js bot for managing RP things.

## Infrastructure

t.b.a.

## Architecture

t.b.a.

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
MONGODB_CONNSTR=mongodb://nhb-user:dev-user@localhost:27017/nhb?authSource=admin
MONGODB_ROOT_USER=nhb-admin
MONGODB_ROOT_PASS=dev-admin
MONGODB_ROOT_NAME=admin
MONGODB_USER=nhb-user
MONGODB_PASS=dev-user
MONGODB_NAME=nhb

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
docker-compose up -d nhb-mongodb nhb-redis
```

The MongoDB will be started with the authentication database `admin` that will contain the user `nhb-user` with the 
password `dev-user` (specified in the dotenv file). The user has read and write permissions on the `nhb` database (also 
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
- **Name:** nhb-redis
- **Username:** default
- **Password:** Value from `.env` file

4. Connect to MongoDB via MongoDB Compass

Enter the connection string from the dotenv file and connect.

## Data Management
### Managing Strings

To manage strings, either add them manually in RedisInsight or use the script in `orchestration/redis/import-strings.sh`. 
The script needs a CSV file with a `;` delimiter to work. 

The script will only work on the local machine.

The best way to achieve data consistence is to either export it with that delimiter or use a `tsv` file and replace all tab characters with semicolons.

