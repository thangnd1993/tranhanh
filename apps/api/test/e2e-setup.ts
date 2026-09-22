// AppModule reads this flag while defining BullMQ processor providers. Set it before
// test modules are imported so HTTP E2E tests never start background workers.
process.env['NODE_ENV'] = 'test';
