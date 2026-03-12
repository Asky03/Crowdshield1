const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

const sns = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const ALERT_LEVELS = new Set(['High', 'Critical']);

const sendCrowdAlert = async (result) => {
  const arn = process.env.AWS_SNS_TOPIC_ARN;
  if (!arn) { console.warn('SNS_TOPIC_ARN not set — skipping alert'); return; }
  if (!ALERT_LEVELS.has(result.risk_level)) return;

  const msg = [
    `CrowdShield Risk Alert`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `Risk Level  : ${result.risk_level}`,
    `Risk Score  : ${result.risk_score}/100`,
    `Crowd Count : ${result.crowd_count} people`,
    `Density     : ${result.density}`,
    `Location    : ${result.location || 'Not specified'}`,
    `File        : ${result.original_filename}`,
    `Time        : ${new Date(result.created_at).toUTCString()}`,
    ``,
    result.risk_level === 'Critical'
      ? '⚠️  CRITICAL: Immediate crowd management action required.'
      : '⚠️  HIGH RISK: Monitor closely and prepare response.',
    ``,
    `Analysis ID : ${result.id}`,
  ].join('\n');

  try {
    await sns.send(new PublishCommand({
      TopicArn: arn,
      Subject: `🚨 CrowdShield ${result.risk_level} Alert`,
      Message: msg,
    }));
    console.log(`📢 SNS alert sent — ${result.risk_level} (${result.id})`);
  } catch (err) {
    console.error('SNS failed (non-fatal):', err.message);
  }
};

module.exports = { sendCrowdAlert };