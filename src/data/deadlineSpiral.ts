import type { ScenarioData } from '../types/scenario';

/**
 * "The Deadline Spiral" — Sample Scenario
 * Hand-authored per the SHRM/ATD-inspired rule set.
 * Node structure: 1 → 2A/B/C/D → 3 → 4A/4B → 5A/5B → Endings
 */
export const deadlineSpiral: ScenarioData = {
  title: 'The Deadline Spiral',
  role: 'Jordan Reyes — Operations Manager, Northbridge Solutions',
  introduction: `It is Monday morning. You arrive at the office to find three urgent messages waiting:\n\n1. The client emailed overnight requesting an emergency status update.\n2. Your senior analyst, Priya, submitted concerns about another employee missing deliverables.\n3. Your director scheduled a same-day executive check-in.\n\nThe implementation deadline is only **12 business days away**.\n\nYour team:\n- **Priya** — highly competent but increasingly frustrated senior analyst\n- **Ethan** — technically talented but missing critical deadlines\n- **Monica** — client relationship lead focused on customer satisfaction\n- **David** — your department director who expects results without excuses\n\nYou must stabilize the situation before the client loses confidence and leadership intervenes.`,
  startNodeId: 'node-1',

  nodes: {

    // ── NODE 1 ───────────────────────────────────────────────────────────────
    'node-1': {
      id: 'node-1', phase: 1, label: 'Morning Crisis',
      type: 'single',
      situation: 'At 8:15 AM, Priya walks into your office.\n\n"I\'m trying to keep this project moving, but Ethan missed another integration checkpoint. This is the third time. I can\'t keep covering for him."\n\nShe appears visibly frustrated. Ten minutes later, Ethan sends a message: "Can we talk later today? There are some things affecting my work that I haven\'t mentioned."\n\nMeanwhile, Monica messages: "The client is nervous. We need consistent communication today."',
      question: 'What do you do first?',
      options: [
        {
          id: 'n1-a', text: 'Meet privately with Priya immediately to understand the operational impact.',
          consequence: 'Priya feels heard and provides detailed insight into workflow disruptions. However, Ethan notices you met with Priya first and becomes cautious — he worries judgment may already exist before you speak with him.',
          scoreDeltas: { trust: 1, accountability: 1 },
          nextNodeId: 'node-2a',
        },
        {
          id: 'n1-b', text: 'Call Ethan first to understand why his performance is slipping.',
          consequence: 'Ethan appreciates the opportunity to explain himself and becomes more open. However, Priya perceives this as leadership tolerating missed accountability without consequence.',
          scoreDeltas: { trust: 2, morale: 1, accountability: -1 },
          nextNodeId: 'node-2b',
        },
        {
          id: 'n1-c', text: 'Schedule a quick cross-functional meeting with everyone involved.',
          consequence: 'The meeting surfaces issues quickly, but tensions escalate publicly. Priya becomes confrontational and Ethan grows defensive. Monica looks alarmed.',
          scoreDeltas: { accountability: 1, morale: -1, risk: -1 },
          nextNodeId: 'node-2c',
        },
        {
          id: 'n1-d', text: 'Focus first on preparing the client update before addressing internal tensions.',
          consequence: 'Monica appreciates the professionalism, and the client receives reassurance early. Internally, however, frustrations continue building without any intervention.',
          scoreDeltas: { stakeholderConfidence: 2, trust: -1, morale: -1 },
          nextNodeId: 'node-2d',
        },
      ],
      routing: [],
    },

    // ── NODE 2A ──────────────────────────────────────────────────────────────
    'node-2a': {
      id: 'node-2a', phase: 2, label: 'Investigating with Priya',
      type: 'single',
      situation: 'Priya explains:\n\n"Ethan isn\'t lazy. But he disappears during critical review windows. Nobody knows whether to wait for him or move forward."\n\nShe shows you three delayed approval chains tied to Ethan\'s work. She then says quietly:\n\n"Honestly, people are starting to lose confidence in him."',
      question: 'How do you respond?',
      options: [
        {
          id: 'n2a-a', text: 'Tell Priya you will formally document Ethan\'s performance issues immediately.',
          consequence: 'Priya feels validated, but the situation risks escalating prematurely before you have full context on what is driving Ethan\'s behavior.',
          scoreDeltas: { accountability: 2, trust: -1, risk: -1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2a-b', text: 'Acknowledge the impact while asking Priya to avoid conclusions until you speak with Ethan.',
          consequence: 'Priya feels partially reassured while you maintain neutrality. Trust in your leadership improves — you are seen as fair, not reactive.',
          scoreDeltas: { trust: 2, accountability: 1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2a-c', text: 'Ask Priya to temporarily absorb Ethan\'s responsibilities to protect the deadline.',
          consequence: 'Short-term productivity may improve slightly, but Priya\'s resentment deepens significantly. The team begins to notice the imbalance.',
          scoreDeltas: { stakeholderConfidence: 1, morale: -2, trust: -1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2a-d', text: 'Encourage Priya to confront Ethan directly peer-to-peer.',
          consequence: 'Priya reluctantly agrees. The peer discussion becomes emotionally charged and damages team trust, making your intervention more difficult later.',
          scoreDeltas: { accountability: 1, trust: -2, morale: -1 },
          nextNodeId: 'node-3',
        },
      ],
      routing: [],
    },

    // ── NODE 2B ──────────────────────────────────────────────────────────────
    'node-2b': {
      id: 'node-2b', phase: 2, label: 'Speaking with Ethan',
      type: 'single',
      situation: 'You call Ethan into a private meeting room. After hesitation, he says:\n\n"My father\'s been hospitalized for two weeks. I\'ve been handling care arrangements at night. I didn\'t want to make excuses."\n\nHe adds: "I know I\'ve dropped the ball. I\'m trying to keep up."\n\nEthan appears exhausted but sincere.',
      question: 'How do you proceed?',
      options: [
        {
          id: 'n2b-a', text: 'Express empathy and immediately reduce Ethan\'s workload temporarily.',
          consequence: 'Ethan becomes highly appreciative, but redistribution pressures the rest of the team unless carefully managed. Priya later hears about it and feels her concerns were secondary.',
          scoreDeltas: { trust: 2, morale: 2, risk: -1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2b-b', text: 'Acknowledge the personal situation while clarifying that deliverables still require accountability.',
          consequence: 'Ethan respects the balanced response. He becomes more transparent moving forward and makes a visible effort to meet key checkpoints.',
          scoreDeltas: { trust: 1, accountability: 2, morale: 1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2b-c', text: 'Advise Ethan to keep personal matters separate from professional expectations.',
          consequence: 'Ethan shuts down emotionally. Future communication becomes minimal, and underlying issues remain unresolved beneath a surface of compliance.',
          scoreDeltas: { trust: -2, morale: -2, accountability: 1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2b-d', text: 'Escalate the issue to HR immediately before discussing any accommodations.',
          consequence: 'HR involvement protects compliance considerations but makes Ethan anxious and defensive. The working relationship becomes transactional.',
          scoreDeltas: { accountability: 1, trust: -1, risk: 1 },
          nextNodeId: 'node-3',
        },
      ],
      routing: [],
    },

    // ── NODE 2C ──────────────────────────────────────────────────────────────
    'node-2c': {
      id: 'node-2c', phase: 2, label: 'Regaining Control',
      type: 'single',
      situation: 'The meeting quickly becomes uncomfortable.\n\nPriya states: "We\'re constantly waiting for missing deliverables."\n\nEthan responds sharply: "Maybe if requirements stopped changing every day, we wouldn\'t have this problem."\n\nMonica looks alarmed as the discussion becomes personal.',
      question: 'How do you regain control of the room?',
      options: [
        {
          id: 'n2c-a', text: 'Pause the meeting and establish clear communication ground rules.',
          consequence: 'The atmosphere stabilizes and professionalism partially returns. The team sees you can hold structure under pressure.',
          scoreDeltas: { trust: 1, accountability: 1, morale: 1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2c-b', text: 'Allow the team to fully air frustrations before intervening.',
          consequence: 'Hidden tensions surface, but emotional damage intensifies. The unstructured venting leaves team members feeling exposed rather than resolved.',
          scoreDeltas: { accountability: 1, trust: -1, morale: -1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2c-c', text: 'Redirect strictly to deadlines and operational tasks, away from emotions.',
          consequence: 'Operational clarity improves temporarily, but resentment remains unaddressed. Team members leave the meeting feeling unheard.',
          scoreDeltas: { accountability: 2, trust: -1, morale: -1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2c-d', text: 'End the meeting immediately and hold separate one-on-ones later.',
          consequence: 'The public conflict de-escalates, though trust among team members continues deteriorating quietly without resolution.',
          scoreDeltas: { trust: 1, morale: -1 },
          nextNodeId: 'node-3',
        },
      ],
      routing: [],
    },

    // ── NODE 2D ──────────────────────────────────────────────────────────────
    'node-2d': {
      id: 'node-2d', phase: 2, label: 'Managing Client Communication',
      type: 'single',
      situation: 'You and Monica prepare a client-facing status update. Monica asks:\n\n"How transparent should we be about internal delays?"\n\nAt the same time, Slack notifications show growing frustration among the project team.',
      question: 'What communication approach do you take with the client?',
      options: [
        {
          id: 'n2d-a', text: 'Be fully transparent about internal staffing and coordination problems.',
          consequence: 'The client appreciates honesty but immediately becomes concerned about project stability. Their confidence drops noticeably.',
          scoreDeltas: { stakeholderConfidence: -1, trust: 1, accountability: 1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2d-b', text: 'Provide a measured update focused on mitigation plans and adjusted timelines.',
          consequence: 'The client feels informed without unnecessary alarm. Confidence remains cautiously stable and the relationship holds.',
          scoreDeltas: { stakeholderConfidence: 2, trust: 1, accountability: 1 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2d-c', text: 'Minimize concerns to maintain short-term client confidence.',
          consequence: 'Short-term reassurance works, but you have set an expectation gap. Future surprises will carry significantly more credibility damage.',
          scoreDeltas: { stakeholderConfidence: 1, trust: -1, risk: -2 },
          nextNodeId: 'node-3',
        },
        {
          id: 'n2d-d', text: 'Delay the update until internal alignment improves.',
          consequence: 'The client grows frustrated by perceived avoidance. Monica privately expresses concern about your responsiveness.',
          scoreDeltas: { stakeholderConfidence: -2, trust: -1 },
          nextNodeId: 'node-3',
        },
      ],
      routing: [],
    },

    // ── NODE 3 ───────────────────────────────────────────────────────────────
    'node-3': {
      id: 'node-3', phase: 3, label: 'Executive Pressure',
      type: 'single',
      situation: 'At 2:00 PM, Director David Chen joins your status meeting.\n\n"Leadership is watching this implementation closely. I need confidence that this team can recover."\n\nHe asks directly:\n\n"Is this a people problem or a management problem?"\n\nThe room goes silent.',
      question: 'How do you respond to your director?',
      options: [
        {
          id: 'n3-a', text: 'Focus on process breakdowns and communication gaps across the team.',
          consequence: 'Leadership sees strategic thinking, though accountability specifics remain unclear. David nods, but looks like he expected more.',
          scoreDeltas: { accountability: 1, trust: 1, stakeholderConfidence: 1 },
        },
        {
          id: 'n3-b', text: 'Highlight individual accountability concerns by naming specific patterns.',
          consequence: 'David appreciates directness, but team morale later declines when word spreads. You are seen as willing to surface problems but not fully owning them.',
          scoreDeltas: { accountability: 2, morale: -1, trust: -1 },
        },
        {
          id: 'n3-c', text: 'Take full ownership as the manager and outline your specific recovery actions.',
          consequence: 'Leadership confidence in you increases substantially. David sits back and says: "That\'s what I needed to hear." The room\'s energy visibly shifts.',
          scoreDeltas: { accountability: 2, trust: 2, stakeholderConfidence: 2 },
        },
        {
          id: 'n3-d', text: 'Deflect responsibility toward unrealistic project expectations from leadership.',
          consequence: 'David becomes visibly skeptical of your leadership maturity. The meeting ends abruptly. Priya avoids eye contact.',
          scoreDeltas: { accountability: -2, trust: -1, stakeholderConfidence: -2 },
        },
      ],
      routing: [
        { condition: 'score >= 10', nextNodeId: 'node-4a' },
        { condition: 'else',        nextNodeId: 'node-4b' },
      ],
    },

    // ── NODE 4A ──────────────────────────────────────────────────────────────
    'node-4a': {
      id: 'node-4a', phase: 4, label: 'Recovery Planning',
      type: 'multi', multiSelectCount: 2,
      situation: 'You now have a window to stabilize the project. Leadership has granted you operational flexibility for the next 48 hours. You need to choose your recovery approach carefully — the team is watching.',
      question: 'Select TWO actions to prioritize.',
      options: [
        {
          id: 'n4a-a', text: 'Implement daily 15-minute checkpoint meetings to restore alignment.',
          consequence: 'Team alignment improves significantly. Small daily touchpoints reduce uncertainty and rebuild communication habits.',
          scoreDeltas: { accountability: 2, morale: 1 },
        },
        {
          id: 'n4a-b', text: 'Privately coach Priya on collaborative communication tone.',
          consequence: 'Priya becomes more constructive in team interactions and less emotionally reactive. Her peers notice the shift.',
          scoreDeltas: { morale: 2, trust: 1 },
        },
        {
          id: 'n4a-c', text: 'Assign Ethan a silent independent workload with minimal team interaction.',
          consequence: 'Isolation reduces Ethan\'s collaboration quality and increases his disengagement risk. The team senses the change but no one speaks up.',
          scoreDeltas: { accountability: 1, morale: -2, trust: -2 },
        },
        {
          id: 'n4a-d', text: 'Create a transparent project risk tracker visible to all stakeholders.',
          consequence: 'Transparency improves accountability and reduces uncertainty. The client later mentions they appreciated the visibility.',
          scoreDeltas: { accountability: 2, stakeholderConfidence: 2, trust: 1 },
        },
        {
          id: 'n4a-e', text: 'Delay difficult conversations until after the delivery date.',
          consequence: 'Unresolved tension quietly worsens. By delivery, two team members have disengaged and post-project feedback is sharply critical.',
          scoreDeltas: { morale: -1, accountability: -2, trust: -1 },
        },
      ],
      routing: [
        { condition: 'multi_includes:n4a-c', nextNodeId: 'node-5b' },
        { condition: 'multi_includes:n4a-e', nextNodeId: 'node-5b' },
        { condition: 'else',                  nextNodeId: 'node-5a' },
      ],
    },

    // ── NODE 4B ──────────────────────────────────────────────────────────────
    'node-4b': {
      id: 'node-4b', phase: 4, label: 'Escalating Friction',
      type: 'single',
      situation: 'Internal trust continues declining. Monica informs you:\n\n"The client has requested a leadership escalation call tomorrow."\n\nMeanwhile, Priya privately says: "People are burned out. Nobody thinks this project is under control."',
      question: 'How do you respond to the escalation risk?',
      options: [
        {
          id: 'n4b-a', text: 'Hold transparent reset meetings with the team and leadership.',
          consequence: 'Trust slowly rebuilds through visibility and honesty. It is not fast, but it is real.',
          scoreDeltas: { trust: 2, accountability: 1, morale: 1 },
          nextNodeId: 'node-5b',
        },
        {
          id: 'n4b-b', text: 'Push the team harder to recover the timeline through effort.',
          consequence: 'Short-term output increases, but morale deteriorates sharply. Two team members later say the final sprint was unsustainable.',
          scoreDeltas: { accountability: 1, morale: -2 },
          nextNodeId: 'node-5b',
        },
        {
          id: 'n4b-c', text: 'Request executive support resources to address the shortfall.',
          consequence: 'Leadership appreciates the proactive request and views you as self-aware. Additional support is partially approved.',
          scoreDeltas: { accountability: 2, stakeholderConfidence: 1 },
          nextNodeId: 'node-5b',
        },
        {
          id: 'n4b-d', text: 'Attempt to quietly manage the issue without escalation.',
          consequence: 'Problems continue compounding beneath the surface. The escalation call proceeds without your preparation.',
          scoreDeltas: { accountability: -2, trust: -1, risk: -2 },
          nextNodeId: 'node-5b',
        },
      ],
      routing: [],
    },

    // ── NODE 5A ──────────────────────────────────────────────────────────────
    'node-5a': {
      id: 'node-5a', phase: 5, label: 'Final Client Presentation',
      type: 'single',
      situation: 'After several days of recovery efforts, the client leadership team joins a critical project status review. The client asks directly:\n\n"Why should we remain confident in this partnership?"\n\nEvery person in the room looks toward you.',
      question: 'What leadership message do you deliver?',
      options: [
        {
          id: 'n5a-a', text: 'Emphasize transparency, corrective actions taken, and collaborative recovery.',
          consequence: 'The client regains confidence in the team\'s professionalism. The lead client stakeholder says: "This is what good partnership looks like."',
          scoreDeltas: { stakeholderConfidence: 3, trust: 2, accountability: 2 },
          nextNodeId: 'ending',
        },
        {
          id: 'n5a-b', text: 'Focus primarily on technical progress metrics and deliverable status.',
          consequence: 'The client appreciates the data but remains emotionally uncertain. Numbers reassure the project manager but not the executive sponsor.',
          scoreDeltas: { stakeholderConfidence: 1, accountability: 1 },
          nextNodeId: 'ending',
        },
        {
          id: 'n5a-c', text: 'Downplay prior issues and pivot quickly to future optimism.',
          consequence: 'The response feels evasive to the client. Monica catches your eye with a look of concern.',
          scoreDeltas: { stakeholderConfidence: -1, trust: -1 },
          nextNodeId: 'ending',
        },
        {
          id: 'n5a-d', text: 'Privately attribute setbacks to internal staffing challenges.',
          consequence: 'The client perceives instability and poor leadership culture. The meeting ends without a firm confidence statement from their side.',
          scoreDeltas: { stakeholderConfidence: -3, accountability: -2, trust: -2 },
          nextNodeId: 'ending',
        },
      ],
      routing: [],
    },

    // ── NODE 5B ──────────────────────────────────────────────────────────────
    'node-5b': {
      id: 'node-5b', phase: 5, label: 'Crisis Point',
      type: 'single',
      situation: 'An internal email chain criticizing team coordination is accidentally forwarded to the client.\n\nMonica messages you immediately:\n\n"We need damage control now. The client just replied — they\'re not happy."',
      question: 'How do you respond?',
      options: [
        {
          id: 'n5b-a', text: 'Address the issue directly with the client and explain corrective actions already underway.',
          consequence: 'Transparency helps contain long-term trust damage. The client is frustrated but respects the directness.',
          scoreDeltas: { trust: 2, stakeholderConfidence: 1, accountability: 2 },
          nextNodeId: 'ending',
        },
        {
          id: 'n5b-b', text: 'Attempt to minimize the seriousness of the email to the client.',
          consequence: 'The client grows more suspicious. Monica later says the attempt to downplay was the moment client trust fully broke.',
          scoreDeltas: { trust: -2, stakeholderConfidence: -2 },
          nextNodeId: 'ending',
        },
        {
          id: 'n5b-c', text: 'Privately discipline the employee responsible for the forwarding error.',
          consequence: 'Internal fear increases without resolving the core communication issues. The client still has the email.',
          scoreDeltas: { accountability: 1, morale: -1, trust: -1 },
          nextNodeId: 'ending',
        },
        {
          id: 'n5b-d', text: 'Call an emergency alignment meeting with leadership and the full project team.',
          consequence: 'Internal coordination improves, though client concerns remain elevated. Leadership sees decisive action.',
          scoreDeltas: { accountability: 1, morale: 1, trust: 1 },
          nextNodeId: 'ending',
        },
      ],
      routing: [],
    },
  },

  endings: [
    {
      id: 'end-success',
      type: 'success',
      title: 'Successful Resolution',
      condition: 'score >= 18',
      narrative: 'The project is delivered only slightly behind schedule. The client states: "This team handled adversity professionally." Priya and Ethan rebuild working trust, and your director recommends you for future strategic assignments.',
      outcomes: [
        'Client relationship preserved and strengthened',
        'Team morale recovers post-delivery',
        'Leadership confidence in you significantly increased',
        'Ethan and Priya reach a functional working dynamic',
      ],
      competencyFeedback: 'You demonstrated strong emotional intelligence, balanced accountability with empathy, and maintained stakeholder confidence under pressure. Your willingness to take ownership at critical moments defined this outcome.',
    },
    {
      id: 'end-partial',
      type: 'partial',
      title: 'Partial Success',
      condition: 'score >= 8',
      narrative: 'The implementation succeeds technically, but morale remains damaged. Ethan later transfers teams. Leadership concludes: "The project survived, but collaboration suffered." You receive coaching recommendations related to stakeholder management and difficult conversations.',
      outcomes: [
        'Project delivered with technical success',
        'Team cohesion not fully restored',
        'Coaching plan initiated by director',
        'Client relationship stable but not strengthened',
      ],
      competencyFeedback: 'Your decisions were generally professional but inconsistent. Key moments called for more decisive ownership or deeper empathy. There were clear opportunities to rebuild trust that were not fully utilized.',
    },
    {
      id: 'end-negative',
      type: 'negative',
      title: 'Escalation Required',
      condition: 'else',
      narrative: 'The client escalates concerns to executive leadership. The project misses major milestones. Two employees formally request reassignment. Your director determines: "The situation was recoverable, but management intervention came too late." Leadership places future opportunities on hold pending a performance review.',
      outcomes: [
        'Client escalated to executive level',
        'Two team members requested reassignment',
        'Project milestones missed',
        'Performance review initiated',
      ],
      competencyFeedback: 'The scenario revealed opportunities to strengthen decision-making under pressure. Avoidance, deflection, and delayed intervention are the patterns most associated with escalation. Each of those moments was recoverable with a different choice.',
    },
  ],

  competencies: [
    'Leadership Communication',
    'Conflict Resolution',
    'Coaching & Feedback',
    'Accountability Management',
    'Emotional Intelligence',
    'Stakeholder Communication',
    'Client Relationship Management',
    'Decision-Making Under Pressure',
  ],

  metadata: {
    estimatedTime: '20–35 minutes',
    difficulty: 'Intermediate',
    audience: ['New Managers', 'Mid-Level Managers', 'HR Business Partners', 'Project Managers'],
  },
};
