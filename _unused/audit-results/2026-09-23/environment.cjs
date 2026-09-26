require('../environment.cjs');
process.env.TEST_DATABASE_URL =
  'postgresql://lamid_test:local_audit_only@127.0.0.1:55433/lamid_test?sslmode=disable';
