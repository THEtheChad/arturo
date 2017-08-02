const assert = require('assert');
const model = require('../test-prep');
const os = require('os');

let Model, Job;

before(async function () {
  Model = await model;
  await Model.sync({ force: true });
  Job = require('../lib/job')(Model);
});

describe('Job', function () {
  beforeEach(async function () {
    await Model.bulkCreate([
      {
        type: 'test.1',
        status: 'schedule',
        payload: JSON.stringify({ test: true })
      },
      { type: 'test.2', status: 'schedule' },
      { type: 'test.3', status: 'paused' }
    ]);
  });

  afterEach(async function () {
    await Model.sync({ force: true });
  });

  describe('#constructor', function () {
    it('should accept an existing instance', async function () {
      let instance = await Model.find({ where: { type: 'test.1' } });

      let job = new Job(instance);
      assert.ok(job.instance);
      assert.deepEqual(job._payload, { test: true });
    });

    it('should create a new instance when passed params', async function () {
      let jobs;
      let job = new Job('custom.job', { payload: true });

      jobs = await Model.findAll();
      assert.equal(jobs.length, 3);

      await job.save();

      jobs = await Model.findAll();
      assert.equal(jobs.length, 4);
    });
  });

  describe('#save', function () {
    it('should persist job to the database', async function () {
      let job = new Job('test.save', { payload: true });
      let instance = await job.save();

      let persisted = await Model.findById(instance.id);
      let jobs = await Model.findAll();

      assert.ok(persisted);
      assert.equal(jobs.length, 4);
    });

    it('should serialize payload', async function () {
      let payload = {
        test1: 1,
        test2: 2,
        nested: { is: true }
      };

      let serialized = JSON.stringify(payload);

      let job = new Job('test.save.payload', payload);
      let instance = await job.save();

      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.payload, serialized);
      assert.equal(instance.payload, serialized);
    });

    it('should always update the host name', async function () {
      let job = new Job('test.host', { payload: true });
      job.instance.host = 'should be overwritten';
      let instance = await job.save();

      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.host, os.hostname());
    });
  });

  describe('#payload (get)', function () {
    it('should retrieve JSON.parsed payload from instance', async function () {
      let instance = await Model.find({ where: { type: 'test.1' } });

      let job = new Job(instance);

      assert.deepEqual(job.payload, { test: true });
    });

    it('should retrieve raw payload from new job', async function () {
      let job = new Job('custom.job', { payload: true });

      assert.deepEqual(job.payload, { payload: true });
    });
  });

  describe('#maxAttempts (get)', function () {
    it('should retrieve max_attempts from an existing job instance', async function () {
      let instance = await Model.find({ where: { type: 'test.1' } });

      let job = new Job(instance);

      assert.deepEqual(job.max_attempts, 10);
    });

    it('should retrieve max_attempts from a new job', async function () {
      let job = new Job('custom.job', { payload: true });

      assert.deepEqual(job.max_attempts, 10);
    });
  });

  describe('#maxAttempts (set)', function () {
    it('should set max_attempts', async function () {
      let job = new Job('test.max_attempts', { payload: true });
      job.max_attempts = 20;

      let instance = await job.save();
      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.max_attempts, 20);
      assert.equal(job.max_attempts, 20);
    });
  });

  describe('#ttl (get)', function () {
    it('should retrieve ttl from an existing job instance', async function () {
      let instance = await Model.find({ where: { type: 'test.1' } });

      let job = new Job(instance);

      assert.deepEqual(job.ttl, 7200000);
    });

    it('should retrieve ttl from a new job', async function () {
      let job = new Job('custom.job', { payload: true });

      assert.deepEqual(job.ttl, 7200000);
    });
  });

  describe('#ttl (set)', function () {
    it('should set ttl', async function () {
      let job = new Job('test.ttl', { payload: true });
      job.ttl = 1000;

      let instance = await job.save();
      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.ttl, 1000);
      assert.equal(job.ttl, 1000);
    });
  });

  describe('#completed', function () {
    let job, instance;

    beforeEach(async function () {
      job = new Job('test.completed', { payload: true });
      instance = await job.save();

      assert.equal(instance.status, 'schedule');
    });

    it('should mark status as `completed`', async function () {
      await job.completed();

      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.status, 'completed');
      assert.equal(job.status, 'completed');
    });

    it('should emit a `completed` event', function (done) {
      job.on('completed', done);
      job.completed();
    });
  });

  describe('#failed', function () {
    let job, instance;

    beforeEach(async function () {
      job = new Job('test.save', { payload: true });
      job.instance.status = 'changeme';
      instance = await job.save();

      assert.equal(instance.status, 'changeme');
    });

    it('should mark status as `schedule` if max_attempts not reached', async function () {
      await job.failed();

      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.status, 'schedule');
      assert.equal(job.status, 'schedule');
    });

    it('should increment attempts', async function () {
      let prev = job.instance.attempts;

      await job.failed();

      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.attempts, prev + 1);
      assert.equal(job.instance.attempts, prev + 1);
    });

    it('should mark status as `failed` if max_attempts reached/exceeded', async function () {
      job.instance.attempts = job.instance.max_attempts - 1;
      await job.instance.save();
      await job.failed();

      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.status, 'failed');
      assert.equal(job.status, 'failed');
    });

    it('should be bypassed when force options is passed', async function () {
      await job.failed(null, { force: true });

      let persisted = await Model.findById(instance.id);

      assert.equal(persisted.status, 'failed');
      assert.equal(job.status, 'failed');
    });

    it('should emit a `failed` event', function (done) {
      job.on('failed', done);
      job.failed();
    });
  });

  describe('#process', function () {
    let job, instance;

    beforeEach(async function () {
      job = new Job('test.process', { payload: true });
      instance = await job.save();
    });

    it('should mark status as `processing`', async function () {
      await job.process(async function () {
        let persisted = await Model.findById(instance.id);

        assert.equal(persisted.status, 'processing');
        assert.equal(job.status, 'processing');
      });
    });

    it('should emit a `processing` event', function (done) {
      job.on('processing', done);
      job.process(function () {
        return true;
      });
    });

    it('should fail job if exceeds ttl (time to live)', function (done) {
      async function exec() {
        job.ttl = 1000;
        job.instance.status = 'changeme';
        await job.save();

        job.on('failed', function (err) {
          assert.equal(this.status, 'schedule');
          done();
        });

        await job.process(function () {
          return new Promise(resolve => {
            setTimeout(resolve, 2000);
          });
        });
      }
      exec().catch(err => {
        throw err;
      });
    });
  });
});
