#!/bin/sh
set -eu
test_root=$(mktemp -d /tmp/tinyshift-pg-XXXXXX)
pg_bin=/usr/lib/postgresql/16/bin
trap '"$pg_bin/pg_ctl" -D "$test_root/data" -m immediate stop >/dev/null 2>&1 || true' EXIT
"$pg_bin/initdb" -D "$test_root/data" -A trust >/dev/null
"$pg_bin/pg_ctl" -D "$test_root/data" -l "$test_root/server.log" \
  -o "-k $test_root -p 55487 -h ''" start >/dev/null
"$pg_bin/psql" -h "$test_root" -p 55487 -d postgres \
  -v ON_ERROR_STOP=1 -f tests/database.sql
echo "Stopped test cluster retained at $test_root for inspection."
