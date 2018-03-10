// const assert = require('assert');
// const Scheduler = require('../lib/server/scheduler');
// const model = require('../test-prep');
// const moment = require('moment');

// let Job, scheduler;

// process.on('unhandledRejection', function(err) {
//   console.error(err);
// });

// before(async function() {
//   Job = await model;
//   await Job.sync({ force: true });
//   scheduler = Scheduler.defaults(Job);
// });

// describe('Scheduler', function() {
//   afterEach(async function() {
//     await Job.sync({ force: true });
//   });

//   describe('#register', function() {
//     it('should', function() {
//       scheduler.register('two-seconds', function() {});

//       assert.equal(scheduler.algorithms.length, 3);
//     });
//   });

//   describe('#getAlgorithm', async function() {
//     it('should retrieve the appropriate algorithm', async function() {
//       let algorithm = scheduler.getAlgorithm('exponential');

//       assert.equal(algorithm.type, 'exponential');
//       assert.ok(algorithm);
//     });

//     it('should return undefined when algorithm does not exist', async function() {
//       let algorithm = scheduler.getAlgorithm('non-existant');

//       assert.equal(algorithm, null);
//     });
//   });

//   describe('#getJobs', async function() {
//     it('should get all jobs with a status of `schedule`', async function() {
//       await Job.bulkCreate([
//         { type: 'test.1', status: 'schedule' },
//         { type: 'test.2', status: 'schedule', scheduling: 'non-existant' },
//         { type: 'test.3', status: 'paused' }
//       ]);

//       let jobs = await scheduler.getJobs();

//       assert.equal(jobs.length, 2);
//     });
//   });

//   describe('#schedule', async function() {
//     it('should adjust schedule based on the scheduler specified', async function() {
//       const scheduled = moment().add(20, 'days');

//       let instance = await Job.create({
//         type: 'test.no.algorithm',
//         status: 'schedule',
//         scheduling: 'test'
//       });

//       scheduler.register('test', () => scheduled);

//       await scheduler.schedule(instance);

//       assert.deepEqual(instance.scheduled, scheduled.toDate());
//     });

//     it('should fail jobs without a matching schedule algorithm', async function() {
//       let instance = await Job.create({
//         type: 'test.no.algorithm',
//         status: 'schedule',
//         scheduling: 'non-existant'
//       });

//       await scheduler.schedule(instance);
//       await instance.reload();

//       assert.equal(
//         instance.message,
//         'scheduling algorithm has not been registered: `non-existant`'
//       );
//       assert.equal(instance.status, 'failed');
//     });
//   });

//   describe('#process', async function() {
//     it('should', async function() {
//       let jobs;

//       await Job.bulkCreate([
//         { type: 'test.process.1', status: 'schedule' },
//         { type: 'test.process.2', status: 'schedule' },
//         { type: 'test.process.3', status: 'schedule' },
//         { type: 'test.process.3', status: 'paused' },
//         { type: 'test.process.3', status: 'random' }
//       ]);

//       jobs = await Job.findAll({ where: { status: 'schedule' } });
//       assert.equal(jobs.length, 3);

//       await scheduler.process({ poll: false });

//       jobs = await Job.findAll({ where: { status: 'schedule' } });
//       assert.equal(jobs.length, 0);

//       jobs = await Job.findAll({ where: { status: 'queued' } });
//       assert.equal(jobs.length, 3);
//     });
//   });
// });
