/**
 * tests/setup.js - loaded before the suite (see .mocharc.json).
 * Guarantees the test environment never touches the development database.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/edunova_lms_test';
