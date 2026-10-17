import assert from "node:assert/strict";
import { splitFeedbackPlayback } from "./src/utils/feedbackPlayback.js";

const content = '**Quick correction:** Say **went** rather than `go`.\n\n**Better expression:** I enjoy reading.\n\n**A natural version of your answer:**\n\n> I went to the park.\n> It was lovely.\n\n**Part 1**\n\nWhat do you study?';
const sections = splitFeedbackPlayback(content);
assert.deepEqual(sections.filter((section) => section.text).map((section) => section.text), [
  'Say went rather than go.', 'I enjoy reading.', 'I went to the park.\nIt was lovely.',
]);
assert.equal(sections.map((section) => section.content).join('\n\n'), content);
assert.equal(splitFeedbackPlayback('What do you study?').some((section) => section.text), false);
assert.equal(splitFeedbackPlayback('**A natural version of your answer:**\n\nNext question?').some((section) => section.text), false);
assert.deepEqual(splitFeedbackPlayback('**Quick correction:** Fine.\r\n\r\nNext?').map((section) => section.text), ['Fine.', '']);
console.log('Feedback playback parsing checks passed.');
