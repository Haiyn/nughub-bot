#!/bin/bash

# Set the REDISCLI_AUTH env variable for redis-cli to use for authentication
export REDISCLI_AUTH=$(cat ../../.env | awk 'match($0, /REDIS_PASS=.*/) {print substr($0, RSTART+11, RLENGTH-1)}')
# Get the host IP
export HOSTIP=$(ip route get 8.8.8.8 | awk -F"src " 'NR==1{split($2,a," ");print a[1]}')

INPUT="$1"
COUNTER=0
IFS=","     # Set file separator to ; instead of a whitespace or shit breaks

echo "Importing $INPUT..."
while read -r group key value; do
  # Skip the first line
  if [ "$key" = "Key" ]; then
    continue
  fi
  value=$(echo "$value" | sed -r "s/\\\"//g")
  echo "Inserting $key: \"$value\"..."

  # Export the read key value pair to subshell
  export KEY=$key
  export VALUE=$(echo $value)
  # Run redis SET command
  sh -c 'redis-cli -h $HOSTIP SET $KEY "$VALUE"';
  COUNTER=$((COUNTER+1))
done < $INPUT
echo "Done reading $INPUT, inserted $COUNTER strings."