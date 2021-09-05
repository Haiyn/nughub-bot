#!/bin/bash
set -e

echo "Initializing DB ${MONGO_INITDB_DATABASE}"
mongo <<EOF
use $MONGO_INITDB_DATABASE
db.createUser({
    user: "$MONGO_USERNAME",
    pwd: "$MONGO_PASSWORD",
    roles: [
        {
            role: 'readWrite',
            db: "$MONGO_INITDB_DATABASE"
        }
    ]
});

db = new Mongo().getDB("$MONGO_DATABASE");

db.createCollection('Test', { capped: false });
EOF