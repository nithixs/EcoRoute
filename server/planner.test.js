const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const {
  createApi,
  estimates,
  point
} = require('./planner');
const start = {
    lat: 13,
    lon: 80,
    name: 'Chennai'
  },
  end = {
    lat: 12,
    lon: 79,
    name: 'Puducherry'
  };
const routing = {
  code: 'Ok',
  routes: [{
    distance: 10000,
    duration: 1200,
    geometry: {
      coordinates: [[80, 13], [79, 12]]
    },
    legs: [{
      steps: [{
        maneuver: {
          type: 'depart'
        },
        distance: 10000,
        name: 'Road'
      }]
    }]
  }, {
    distance: 12000,
    duration: 1000,
    geometry: {
      coordinates: [[80, 13], [79, 12]]
    },
    legs: [{
      steps: []
    }]
  }]
};
async function server(t, request) {
  const app = express();
  app.use(express.json());
  app.use('/api', createApi({
    request
  }));
  const s = app.listen(0, '127.0.0.1');
  await new Promise(r => s.once('listening', r));
  t.after(() => new Promise(r => s.close(r)));
  return async (path, body) => {
    const res = await fetch(`http://127.0.0.1:${s.address().port}/api/${path}`, body ? {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    } : {});
    return {
      status: res.status,
      data: await res.json()
    };
  };
}
test('estimates scale with passengers and electric vehicle factors', () => {
  const r = estimates({
    distance: 10000,
    duration: 1200
  }, 'petrol', 2);
  assert.equal(r.co2, 1.7);
  assert.equal(r.perPerson, .85);
  assert.equal(r.cost, 70);
  assert.equal(estimates({
    distance: 10000,
    duration: 1200
  }, 'electric', 1).co2, .7);
});
test('coordinates reject invalid and string values', () => {
  assert.ok(point(start));
  assert.ok(!point({
    lat: '13',
    lon: 80
  }));
  assert.ok(!point({
    lat: 91,
    lon: 80
  }));
  assert.ok(!point({
    lat: NaN,
    lon: 80
  }));
});
test('planner ranks routes and tolerates weather outage; assistant uses server trip', async t => {
  const api = await server(t, async url => {
    if (url.includes('forecast')) throw Error();
    return routing;
  });
  const r = await api('plan', {
    start,
    end,
    vehicle: 'petrol',
    passengers: 2
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.ecoId, 0);
  assert.equal(r.data.fastestId, 1);
  assert.equal(r.data.weather, null);
  assert.deepEqual(r.data.routes[0].geometry[0], [13, 80]);
  const a = await api('assistant', {
    tripId: r.data.id,
    question: 'Help'
  });
  assert.equal(a.status, 200);
  assert.equal(a.data.mode, 'local');
  assert.match(a.data.answer, /1.7 kg/);
});
test('invalid inputs and missing trip do not contact upstream', async t => {
  const api = await server(t, () => {
    throw Error('must not call');
  });
  assert.equal((await api('plan', {
    start,
    end,
    vehicle: '__proto__'
  })).status, 400);
  assert.equal((await api('plan', {
    start,
    end,
    passengers: 0
  })).status, 400);
  assert.equal((await api('plan', {
    start,
    end: start
  })).status, 400);
  assert.equal((await api('assistant', {
    tripId: 'missing',
    question: 'Hello'
  })).status, 404);
});
test('routing failures are actionable errors', async t => {
  const api = await server(t, async () => ({
    code: 'NoRoute'
  }));
  assert.equal((await api('plan', {
    start,
    end
  })).status, 422);
});
test('place search encodes input and maps provider data', async t => {
  const api = await server(t, async url => {
    assert.match(url, /name=Chennai/);
    return {
      results: [{
        name: 'Chennai',
        country: 'India',
        latitude: 13,
        longitude: 80
      }]
    };
  });
  const r = await api('places?q=Chennai');
  assert.deepEqual(r.data.places, [{
    name: 'Chennai, India',
    lat: 13,
    lon: 80
  }]);
});
test('AI answer is grounded in server context and requests no provider storage', async t => {
  const originalKey = process.env.OPENAI_API_KEY,
    originalModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = 'test-only-key';
  process.env.OPENAI_MODEL = 'test-model';
  t.after(() => {
    for (const [key, value] of [['OPENAI_API_KEY', originalKey], ['OPENAI_MODEL', originalModel]]) {
      if (value === undefined) delete process.env[key];else process.env[key] = value;
    }
  });
  let body;
  const api = await server(t, async (url, options) => {
    if (url.includes('openai.com')) {
      body = JSON.parse(options.body);
      return {
        output: [{
          content: [{
            type: 'output_text',
            text: 'Use route 1 for a lower estimated footprint.'
          }]
        }]
      };
    }
    if (url.includes('forecast')) return {
      current: {
        temperature_2m: 29,
        precipitation: 0
      }
    };
    return routing;
  });
  const plan = await api('plan', {
    start,
    end
  });
  const reply = await api('assistant', {
    tripId: plan.data.id,
    question: 'Which route?',
    language: 'Tamil'
  });
  assert.equal(reply.status, 200);
  assert.equal(reply.data.mode, 'ai');
  assert.equal(body.store, false);
  assert.match(body.instructions, /Tamil/);
  assert.match(body.instructions, /untrusted/);
  const context = JSON.parse(body.input);
  assert.equal(context.trip.routes[0].co2, 1.7);
  assert.equal(context.trip.routes[0].geometry, undefined);
  assert.ok(!JSON.stringify(reply).includes('test-only-key'));
});
