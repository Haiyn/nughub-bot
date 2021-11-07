#!/bin/bash

# Set the REDISCLI_AUTH env variable for redis-cli to use for authentication
export REDISCLI_AUTH=$(cat ../../.env | awk 'match($0, /REDIS_PASS=.*/) {print substr($0, RSTART+11, RLENGTH-1)}')
# Get the host IP
export HOSTIP=$(ip route get 8.8.8.8 | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')

INPUT="$1"
COUNTER=0
IFS=";"     # Set file separator to ; instead of a whitespace or shit breaks

echo "Importing $INPUT..."
while read -r i; do
  # Read the line from the file and save it to variables
  KEY=$(echo "$i" | awk 'BEGIN { FS = ";" } ; { print $1 }');
  VALUE=$(echo "$i" | awk 'BEGIN { FS = ";" } ; { print $2 }');
  TYPE=$(echo "$i" | awk 'BEGIN { FS = ";" } ; { print $3 }');
  if [ "$KEY" = "Key" ]; then
    continue
  fi
  echo "Inserting $KEY: \"$VALUE\"..."

  # Export the read key value pair to subshell
  export KEY=$KEY
  export VALUE=$VALUE
  # Run redis SET command
  case "$TYPE" in
    ("STRING") sh -c 'redis-cli -h $HOSTIP SET $KEY "$VALUE"'; ;;
    ("SET") sh -c 'redis-cli -h $HOSTIP SADD $KEY "$VALUE"'; ;;
    ("LIST") sh -c 'redis-cli -h $HOSTIP LPUSH $KEY "$VALUE"'; ;;
    (*) echo "No case found for type $TYPE" ;;
  esac
  COUNTER=$((COUNTER+1))
done < $INPUT
echo "Done reading $INPUT, inserted $COUNTER configuration values."