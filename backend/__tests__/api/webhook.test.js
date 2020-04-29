import { expect } from 'chai';

import { chain } from '~/helpers/promise';
import Webhook from '~/models/Webhook';

const GITHUB_VALID_IP = '192.30.252.42';

describe('Webhook', () => {
  describe('POST /webhooks/github', () => {
    it('should prevent entries from non-whitelisted ips', (done) => {
      sendGithubWebhook('random-uid', '111.111.111.111')
        .catch((err) => {
          expect(err.status).to.equal(500);
          Webhook.find({}).exec().then((webhooks) => {
            expect(webhooks.length).to.equal(0);
            done();
          });
        });
    });

    it('should prevent duplicate entries', (done) => {
      chain
        .then(() => sendGithubWebhook())
        .then((res) => {
          expect(res.status).to.equal(200);
          return sendGithubWebhook();
        })
        .then((res) => {
          expect(res.status).to.equal(200);
          return sendGithubWebhook('different-github-uid');
        })
        .then((res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.eql({ message: 'OK' });
          Webhook.find({}).exec().then((webhooks) => {
            expect(webhooks.length).to.equal(2);
            done();
          });
        });
    });

    it('should create a Webhook entry if the request is valid (issue_comment test)', (done) => {
      sendGithubWebhook()
        .then((res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.eql({ message: 'OK' });
          Webhook.findOne({}).exec().then((webhook) => {
            expect(webhook.type).to.equal('github');
            expect(webhook.uid).to.equal('45bb5780-ceca-11e6-9b9e-67ff3f65ca27');
            expect(webhook.github.repository).to.equal('github/repo');
            expect(webhook.github.action).to.equal('created');
            expect(webhook.github.comment.body).to.equal('commentBody');
            done();
          });
        });
    });

    it('should create a Webhook entry if the request is valid (issues test)', (done) => {
      request
        .post(`${server}/webhooks/github`)
        .set('X-Forwarded-For', GITHUB_VALID_IP)
        .set('X-GitHub-Delivery', '1111')
        .set('X-GitHub-Event', 'issues')
        .send({
          action: 'opened',
          repository: { full_name: 'github/repo' },
          issue: {
            number: 1,
            title: 'issueTitle',
            user: { login: 'issueUser' },
            body: 'bodyText',
          },
        })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.eql({ message: 'OK' });
          Webhook.findOne({}).exec().then((webhook) => {
            expect(webhook.type).to.equal('github');
            expect(webhook.uid).to.equal('1111');
            expect(webhook.github.repository).to.equal('github/repo');
            expect(webhook.github.action).to.equal('opened');
            expect(webhook.github.issue.body).to.equal('bodyText');
            expect(webhook.github.issue.comment).to.be.empty;
            done();
          });
        });
    });

    it('should create a Webhook entry if the request is valid (pull_request test)', (done) => {
      request
        .post(`${server}/webhooks/github`)
        .set('X-Forwarded-For', GITHUB_VALID_IP)
        .set('X-GitHub-Delivery', '1111')
        .set('X-GitHub-Event', 'pull_request')
        .send({
          repository: { full_name: 'github/repo' },
          pull_request: {
            number: 1,
            user: { login: 'octocat' },
          },
        })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.eql({ message: 'OK' });
          Webhook.findOne({}).exec().then((webhook) => {
            expect(webhook.type).to.equal('github');
            expect(webhook.uid).to.equal('1111');
            expect(webhook.github.repository).to.equal('github/repo');
            expect(webhook.github.pull_request.number).to.equal(1);
            expect(webhook.github.pull_request.user).to.equal('octocat');
            done();
          });
        });
    });

    it('should create a Webhook entry if the request is valid (push test)', (done) => {
      request
        .post(`${server}/webhooks/github`)
        .set('X-Forwarded-For', GITHUB_VALID_IP)
        .set('X-GitHub-Delivery', '1111')
        .set('X-GitHub-Event', 'push')
        .send({
          repository: { full_name: 'github/repo' },
          commits: [{ id: '1' }],
          head_commit: { id: '1' },
          pusher: { name: 'a', email: 'a@b.com' },
        })
        .end((err, res) => {
          expect(res.status).to.equal(200);
          expect(res.body).to.eql({ message: 'OK' });
          Webhook.findOne({}).exec().then((webhook) => {
            expect(webhook.type).to.equal('github');
            expect(webhook.uid).to.equal('1111');
            expect(webhook.github.repository).to.equal('github/repo');
            expect(webhook.github.commits.length).to.equal(1);
            expect(webhook.github.head_commit.id).to.equal('1');
            expect(webhook.github.pusher.name).to.equal('a');
            done();
          });
        });
    });
  });

  describe('GET /webhooks/github', () => {
    it('should return a list of webhooks', (done) => {
      chain
        .then(() => sendGithubWebhook())
        .then(() => {
          request
            .get(`${server}/webhooks/github/github/repo`)
            .end((err, res) => {
              expect(res.status).to.equal(200);
              expect(res.body.length).to.equal(1);
              expect(res.body[0].github.repository).to.equal('github/repo');
              done();
            });
        });
    });
  });
});

function sendGithubWebhook(uid = '45bb5780-ceca-11e6-9b9e-67ff3f65ca27', ip = GITHUB_VALID_IP) {
  return new Promise((resolve, reject) => {
    request
      .post(`${server}/webhooks/github`)
      .set('X-Forwarded-For', ip)
      .set('X-GitHub-Delivery', uid)
      .set('X-GitHub-Event', 'issue_comment')
      .send({
        action: 'created',
        repository: { full_name: 'github/repo' },
        issue: {
          number: 1,
          title: 'issueTitle',
          user: { login: 'issueUser' },
        },
        comment: {
          id: 111,
          user: { login: 'commentUser' },
          body: 'commentBody',
        },
      })
      .end((err, res) => {
        if (err) return reject(err);
        return resolve(res);
      });
  });
}