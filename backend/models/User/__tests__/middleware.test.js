/* eslint-disable no-unused-expressions */

import { expect } from 'chai';
import sinon from 'sinon';

import User from '../';
import { hashPassword } from '../middleware';

describe('Model: User (middleware)', () => {
  it('should return a hashed password on password modification', (done) => {
    const user = new User({ password: '1234' });
    const setModified = sinon.stub(user, 'isModified', () => true);
    hashPassword.call(user, () => {
      expect(user.password).to.be.a('string');
      expect(user.password).not.to.equal('1234');
      done();
    });
    setModified.restore();
  });

  it('should not return a hashed password when password was not modified', (done) => {
    const user = new User({ password: '1234' });
    const setModified = sinon.stub(user, 'isModified', () => false);
    hashPassword.call(user, () => {
      expect(user.password).to.equal('1234');
      done();
    });
    setModified.restore();
  });
});
