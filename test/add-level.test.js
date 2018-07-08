'use strict'

const { test } = require('tap')
const { sink, once } = require('./helper')
const pino = require('../')

test('can add a custom level via exported pino function', async ({is}) => {
  const stream = sink()
  const instance = pino({level: 'foo', levelVal: 35}, stream)
  is(typeof instance.foo, 'function')
  instance.foo('bar')
  const { msg } = await once(stream, 'data')
  is(msg, 'bar')
})

test('can add a custom level to a prior instance', async ({is}) => {
  const stream = sink()
  const instance = pino(stream)
  instance.addLevel('foo2', 35)
  is(typeof instance.foo2, 'function')
  instance.foo2('bar')
  const { msg } = await once(stream, 'data')
  is(msg, 'bar')
})

test('custom level via exported pino function does not affect other instances', async ({is}) => {
  const instance = pino({level: 'foo3', levelVal: 36})
  const other = pino()
  is(typeof instance.foo3, 'function')
  is(typeof other.foo3, 'undefined')
})

test('custom level on one instance does not affect other instances', async ({is}) => {
  const instance = pino()
  instance.addLevel('foo4', 37)
  const other = pino()
  instance.addLevel('foo5', 38)
  is(typeof other.foo4, 'undefined')
  is(typeof other.foo5, 'undefined')
})

test('custom levels encompass higher levels', async ({is}) => {
  const stream = sink()
  const instance = pino({level: 'foo', levelVal: 35}, stream)
  instance.warn('bar')
  const { msg } = await once(stream, 'data')
  is(msg, 'bar')
})

test('after the fact add level does not include lower levels', async ({is}) => {
  const stream = sink()
  const instance = pino(stream)
  instance.addLevel('foo', 35)
  instance.level = 'foo'
  instance.info('nope')
  instance.foo('bar')
  const { msg } = await once(stream, 'data')
  is(msg, 'bar')
})

test('after the fact add of a lower level does not include it', async ({is}) => {
  const stream = sink()
  const instance = pino(stream)
  instance.level = 'info'
  instance.addLevel('foo', 15)
  instance.info('bar')
  instance.foo('nope')
  const { msg } = await once(stream, 'data')
  is(msg, 'bar')
})

test('children can be set to custom level', async ({is}) => {
  const stream = sink()
  const parent = pino({level: 'foo', levelVal: 35}, stream)
  const child = parent.child({childMsg: 'yes'})
  child.foo('bar')
  const { msg, childMsg } = await once(stream, 'data')
  is(msg, 'bar')
  is(childMsg, 'yes')
})

test('custom levels exists on children', async ({is}) => {
  const stream = sink()
  const parent = pino({}, stream)
  parent.addLevel('foo', 35)
  const child = parent.child({childMsg: 'yes'})
  child.foo('bar')
  const { msg, childMsg } = await once(stream, 'data')
  is(msg, 'bar')
  is(childMsg, 'yes')
})

test('rejects already known labels', async ({is}) => {
  const instance = pino({level: 'info', levelVal: 900})
  is(instance.levelVal, 30)
  is(instance.addLevel('error', 200), false)
  is(instance.levels.values.error, 50)
  is(200 in instance.levels.labels, false)
})

test('reject already known values', async ({is}) => {
  try {
    pino({level: 'foo', levelVal: 30})
  } catch (e) {
    is(e.message.indexOf('level value') > -1, true)
  }
  const instance = pino()
  is(instance.addLevel('foo', 50), false)
  is(instance.levels.labels[50], 'error')
  is('foo' in instance.levels.values, false)
})

test('reject values of Infinity', async ({throws}) => {
  throws(() => {
    pino({level: 'foo', levelVal: Infinity})
  }, /.*level value is already used.*/)
})

test('level numbers are logged correctly after level change', async ({is}) => {
  const stream = sink()
  const instance = pino({level: 'foo', levelVal: 25}, stream)
  instance.level = 'debug'
  instance.foo('bar')
  const { level } = await once(stream, 'data')
  is(level, 25)
})

test('levels state is not shared between instances', async ({is}) => {
  const instance1 = pino({level: 'foo', levelVal: 35})
  is(typeof instance1.foo, 'function')
  const instance2 = pino()
  is(instance2.hasOwnProperty('foo'), false)
})
