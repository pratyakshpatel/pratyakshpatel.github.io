# I Started With Postgres. Then the Questions Changed.

*How I think about normal databases, vector search, and HydraDB when an AI system needs the right context.*

When I start building an application, I do not begin by asking which new database I can add. I begin with the boring choice, and I mean that as a compliment.

I create a PostgreSQL database.

There is a table for customers, another for projects, another for employees, and another for invoices. Every customer has an ID. Every project has an owner. Every invoice belongs to a customer. The shape is familiar, the rules are clear, and almost everyone on the team knows how to work with it.

For most of the questions the application asks, this is exactly what I want.

How much does Northstar owe us? Which invoices are late? Who owns the Ledger project? Did the payment go through?

These questions have known paths. I know which tables contain the answer. I can join them, filter the rows, and get one exact result. If an invoice points to a customer who does not exist, the database can reject it. If I need to update three records together, a transaction can make sure that either all three changes happen or none of them do.

This is why I do not find “tables cannot represent relationships” to be a useful argument for graph databases. Tables represent relationships every day. A project row containing an employee ID is already saying that this project belongs to that employee. PostgreSQL has good support for [joins](https://www.postgresql.org/docs/current/tutorial-join.html), [foreign keys](https://www.postgresql.org/docs/current/tutorial-fk.html), and [transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html). Those are not minor conveniences. They are the reason I trust a normal database with money, accounts, and the current state of an application.

The interesting part begins later, when the questions change.

## The first database was doing its job

Imagine that I am building an internal assistant for a software company. One of our customers is Northstar. Northstar uses our Ledger product. Mira owns Ledger. Ledger depends on an internal Billing service, and Billing uses an outside payment provider.

At first, this is still ordinary database work. The customer page needs Northstar's plan and renewal date. The project page needs Mira's employee record. Finance needs invoice totals. PostgreSQL is a natural system of record for all of it.

I could even model the service dependencies in tables. One row says that Ledger depends on Billing. Another says that Billing depends on the payment provider. If I want to walk through a chain whose length I do not know in advance, PostgreSQL supports [recursive queries](https://www.postgresql.org/docs/current/queries-with.html).

Nothing has failed yet. The point is not that SQL is unable to follow a relationship. The point is that following changing relationships may become the main work of the application rather than an occasional query.

Then the company connects Slack, Notion, support tickets, product documents, and meeting notes to the assistant. The data is no longer only a set of tidy records. It is also a large collection of sentences written by different people at different times.

Now somebody asks, “What is blocking the Northstar launch?”

I no longer know which table contains the answer. It may be in a project update that says Billing is delayed. It may be in a support ticket about the payment provider. It may be in a meeting note where Mira says legal approval is still missing. The wording in those sources may not match the wording in the question.

This is where vector search becomes useful.

<figure class="db-visual db-choice-map" aria-labelledby="choice-map-title">
  <figcaption id="choice-map-title"><strong>One company, three different kinds of questions</strong></figcaption>
  <div class="db-choice-grid">
    <section class="db-choice db-choice-sql">
      <p class="db-kicker">Relational database</p>
      <p class="db-question">“How much does Northstar owe?”</p>
      <p>Follow known columns, rules, and joins.</p>
    </section>
    <section class="db-choice db-choice-vector">
      <p class="db-kicker">Vector search</p>
      <p class="db-question">“Find notes about the launch blocker.”</p>
      <p>Find passages whose meaning resembles the question.</p>
    </section>
    <section class="db-choice db-choice-hydra">
      <p class="db-kicker">HydraDB</p>
      <p class="db-question">“What is blocking it now, and why?”</p>
      <p>Combine search with people, projects, dependencies, sources, and time.</p>
    </section>
  </div>
</figure>

## Vectors help me find language, not truth

Vector search sounds more mysterious than it needs to. A model turns each passage into a list of numbers that roughly represents its meaning. The same happens to my question. The database then looks for passages whose number patterns are close to the question's pattern.

That lets “What is blocking the launch?” find a note that says “Northstar cannot go live until Billing clears review,” even though the two sentences use different words.

That is genuinely useful. It is why I would not frame vectors as the bad database that a graph must defeat. PostgreSQL itself can add vector search through [pgvector](https://github.com/pgvector/pgvector), and dedicated vector databases are good choices when semantic document search is the main job.

But similarity answers a narrow question: which passages look most like this query?

It does not automatically answer: which passage is current, which customer does it concern, which person had authority to say it, what changed afterward, and which other facts must be connected before I can respond?

Suppose the search returns three passages:

- A planning document from January says Mira owns Ledger.
- A Slack message from Friday says Arjun is taking over Ledger.
- A support ticket from Monday says Mira helped diagnose a Billing issue.

All three mention the right project and the right people. The support ticket may even be the closest match to a question about a current incident. But it does not prove that Mira still owns the project. Mentioning, helping, approving, and owning are four different relationships.

I can add metadata filters. I can store a customer ID, source date, document type, and access list next to every vector. I can retrieve more candidates and rerank them. These are sensible improvements. HydraDB's own writing does not say that vectors are useless; its article on [vector databases and memory layers](https://hydradb.com/blog/vector-database-vs-memory-layer-why-your-ai-agent-needs-both) describes them as different tools that can work together.

The limit appears when my application has to rebuild a connected answer from isolated passages on every request. I start writing application code that says: search for the project, extract the people, check the employee table, find later updates, follow the service dependency, apply permissions, discard old facts, and keep the sources so the answer can be explained.

At that point, the vector database is still doing its job. I am asking the rest of my application to do another one.

## The question has become a path

Let me return to the launch blocker.

Northstar uses Ledger. Ledger depends on Billing. Billing is waiting for a security review. Arjun owns Ledger now. Leena is the security reviewer. A Friday handover ended Mira's ownership. Each fact is small, but the answer lives in the path between them.

In a graph, I can store the important things as individual entities and give their connections names:

Northstar **uses** Ledger. Ledger **depends on** Billing. Billing **requires approval from** Leena. Arjun **owns** Ledger. The Friday message **supports** the ownership change.

The labels matter. If Mira mentioned Ledger, that is not the same as Mira owning Ledger. If a policy applies to Billing, that is not the same as a policy merely containing the word “billing.” A graph gives those differences a direct place in the model.

<figure class="db-visual db-path-visual" aria-labelledby="path-title">
  <figcaption id="path-title"><strong>The answer is not one record. It is a connected path.</strong></figcaption>
  <div class="db-path" role="img" aria-label="Northstar uses Ledger, Ledger depends on Billing, Billing requires approval from Leena. Arjun owns Ledger, supported by a handover message.">
    <span class="db-node">Northstar</span>
    <span class="db-edge">uses</span>
    <span class="db-node">Ledger</span>
    <span class="db-edge">depends on</span>
    <span class="db-node">Billing</span>
    <span class="db-edge">approval from</span>
    <span class="db-node">Leena</span>
  </div>
  <div class="db-path db-path-secondary" aria-hidden="true">
    <span class="db-node">Arjun</span>
    <span class="db-edge">owns</span>
    <span class="db-node">Ledger</span>
    <span class="db-edge">supported by</span>
    <span class="db-node db-node-source">Friday handover</span>
  </div>
</figure>

I can represent all of this in relational tables. I can have an entities table, a relationships table, and columns for relationship type and dates. With enough care, I can build a good system that way. A graph database does not make an impossible query possible. It changes what the database treats as the main shape of the work.

In SQL, relationships are usually reconstructed by joining rows. In a graph database, following named relationships is the central operation. That difference matters when nearly every useful answer requires several steps, the number of steps varies, and the application needs the path as evidence.

It also creates a new responsibility. A graph can spread a bad fact just as efficiently as a good one. If I merge two people named Arjun, create a vague “related to” edge, or treat a mention as proof, the graph will not rescue me. It will make the mistake easier to follow. The quality of the entities, relationships, and sources still decides the quality of the answer.

## Friday changes the answer

The part of HydraDB's work that I find most important is not simply that it stores a graph. It is that its strongest technical writing treats time as part of the data.

Mira owns Ledger on Thursday. Arjun takes over on Friday. The handover message is imported on Monday.

There are two different clocks here. Friday is when the change became true in the company. Monday is when the database learned about it. Those dates answer different questions.

If I ask, “Who owns Ledger now?” I want Arjun. If I ask, “Why did Mira approve the change on Thursday?” I need the earlier state. If I ask, “What did the assistant know on Saturday?” the honest answer may still be Mira, because the handover had not been imported.

<figure class="db-visual db-timeline-visual" aria-labelledby="timeline-title">
  <figcaption id="timeline-title"><strong>One change, two timelines</strong></figcaption>
  <div class="db-timeline" role="img" aria-label="In the real world Mira approved a change on Thursday and Arjun became owner on Friday. In the system the old state was still visible on Saturday, and the handover was imported on Monday.">
    <div class="db-timeline-label">Real world</div>
    <div class="db-timeline-track">
      <div class="db-event db-event-one"><span>Thu</span><strong>Mira approves</strong></div>
      <div class="db-event db-event-two"><span>Fri</span><strong>Arjun becomes owner</strong></div>
    </div>
    <div class="db-timeline-label">System record</div>
    <div class="db-timeline-track db-timeline-system">
      <div class="db-event db-event-one"><span>Sat</span><strong>Old state still visible</strong></div>
      <div class="db-event db-event-three"><span>Mon</span><strong>Handover imported</strong></div>
    </div>
  </div>
  <p class="viz-caption">The effective date tells me when the company changed. The recorded date tells me when the system learned about it.</p>
</figure>

A simple update would replace Mira with Arjun. That keeps the present tidy but removes the explanation for the past. Keeping both statements as unrelated text chunks is not much better; the assistant sees a contradiction without knowing its order.

HydraDB's essay [“Git for Context”](https://hydradb.com/blog/git-for-context-versioned-temporal-graphs-ai-agent-memory) describes a different shape: keep changes as a history rather than destructively overwriting the earlier relationship. Its graph records both when a fact was committed and when it was valid in the real world. The current answer and the historical answer can then come from the same record of change.

I like this because it makes memory less mystical. The model does not need to “remember” in the human sense. The system needs to store changes carefully and retrieve the state that matches the question.

PostgreSQL can preserve history too. I can add audit tables, effective dates, event logs, and rules for rebuilding state. For many teams, that may be the right choice. The comparison is not “possible in HydraDB, impossible in Postgres.” It is “built into the centre of the model, or assembled around a database whose main job is something else.”

## What HydraDB is actually combining

After reading HydraDB's documentation and its articles, I do not think the most useful description is “a graph database instead of a normal database.” That is too small.

HydraDB is trying to be the context layer between a company's scattered information and the agent that needs to act on it.

Its current [documentation](https://docs.hydradb.com/index) separates knowledge from memories. Knowledge includes documents and shared sources. Memories include preferences, decisions, conversations, and other state that changes with use. A query can search either one or both. The retrieval path can use text search, semantic search, metadata, relationships, and time rather than forcing every question through one signal.

That matters because each signal fixes a different blind spot:

- Exact filters help me stay inside the right customer, project, date, or permission boundary.
- Text search helps when the exact phrase, name, error code, or policy number matters.
- Vector search helps when the words differ but the meaning is close.
- Graph traversal helps when the answer depends on how people, projects, services, and sources connect.
- Time helps separate what is current from what used to be true.
- Source tracking helps me show which record supports a claim.

I would not use all six for every question. “What is Northstar's account ID?” should be a direct lookup. “Find the conversation where the launch delay was discussed” may need text and vector search. “What is blocking Northstar now?” may begin with search, identify Ledger and Billing, follow their current relationships, check the latest valid state, and return the sources that justify the result. A good context system should make the difficult route available without forcing the simple question to take it.

This also changes how I think about retrieval. I am not asking the database to collect as much related material as possible. More context can make an answer worse when old, private, or merely similar passages crowd out the few records that matter. I want the smallest useful set: the exact facts, the relevant path, the current time window, and enough source material for the agent to explain its answer. The goal is not a fuller prompt. It is a better grounded one.

HydraDB's piece on [B-trees, vectors, and graphs](https://hydradb.com/blog/btree-vector-graph-hybrid-search-storage-layer) is useful here because it does not treat this combination as a free lunch. Exact lookups, vector search, and graph traversal ask storage to move through data in different ways. Running them as separate systems creates coordination work. Combining them creates hard engineering work inside the database. Either way, somebody pays for the assembly.

The open-source engine's [architecture](https://github.com/hydra-db/hydradb/blob/main/architecture.md) puts durable graph data in S3-compatible object storage and separates writing, indexing, and reading. Memory and local solid-state drives act as faster caches for frequently used data. In plain language, long-term storage does not have to grow on the same machines that answer every query, and the read side can keep hot information close.

That design is interesting, but I would not turn an architecture diagram into a performance claim. Cold data still has to be fetched. Indexes still have to become current. Broad graph walks can still grow quickly. The value has to be shown on the actual workload.

This is also why I appreciate HydraDB's own [guide to choosing a graph database](https://hydradb.com/blog/graph-database-for-ai). It says not to use a graph merely because graphs are available. If the application mainly performs semantic document search, a vector or relational solution may be enough. The graph earns its place when explicit relationships improve the answer, its scope, its permissions, or its explanation.

## I would keep Postgres

In the imaginary company, I would not move invoices, payments, account balances, and the official subscription state out of PostgreSQL just because the assistant needs connected context.

Postgres remains the system of record for clean operational facts. It is good at enforcing rules around those facts, updating them safely, and producing exact reports. A vector index remains useful for finding passages by meaning. HydraDB becomes interesting when the product repeatedly needs to assemble those facts and passages into a changing, connected answer.

That gives me a simple mental model:

<figure class="db-visual db-stack-visual" aria-labelledby="stack-title">
  <figcaption id="stack-title"><strong>I would give each layer one clear job</strong></figcaption>
  <div class="db-stack">
    <div><span>Agent</span><strong>Explains and acts</strong></div>
    <div><span>HydraDB</span><strong>Assembles connected, current context</strong></div>
    <div><span>Vector search</span><strong>Finds semantically similar material</strong></div>
    <div><span>PostgreSQL and source apps</span><strong>Hold canonical business state and original records</strong></div>
  </div>
</figure>

The boundaries will not always look exactly like this. HydraDB includes vector retrieval, so a separate vector database may not be necessary. Some teams can build the context layer in Postgres. Some applications do not need a context graph at all. The diagram is a way to assign responsibilities, not a required shopping list.

It also reveals the hardest operational question: how do changes move between the layers?

If PostgreSQL says Arjun owns Ledger but the context graph still says Mira, the assistant may be eloquent and wrong. If a source document is deleted, its extracted relationships should not live forever without explanation. If a user cannot open a private document, the assistant should not reveal it indirectly through a graph path.

Freshness, deletion, permissions, identity, and source tracking are not finishing touches. They are part of whether the answer is correct.

## The test I would run before believing the story

I would begin with twenty or thirty real questions, not a million synthetic nodes.

Some would be easy: What does Northstar owe? Who owns Ledger now? Find the latest launch plan.

Some would require a path: Which customer launches depend on Billing? Who can approve the change? Which decision created the current blocker?

Some would require history: Who owned Ledger last Thursday? What did the assistant know on Saturday? Which source changed the answer on Monday?

Then I would build honest baselines. PostgreSQL gets sensible schemas, indexes, and recursive queries. Vector search gets good chunks, metadata filters, and reranking. HydraDB gets a clear set of entities and relationships, bounded traversals, permissions, and the same source material.

I would compare correct answers before response times. If the vector system returns a recent mention while HydraDB returns the recorded owner, they did not answer the same question. If the graph follows an unsupported relationship, the fact that it found a complete path is not a win.

For every answer, I would ask:

- Is it correct now?
- Can it answer the same question for an earlier date?
- Can it show the source for each important claim?
- Does it stop at the caller's permission boundary?
- How soon does an update change the answer?
- What happens when two sources disagree?
- What happens when a highly connected node creates thousands of possible paths?
- How much application code is required to keep the whole thing reliable?

Only then would I measure normal response time, slow response time, ingestion cost, storage cost, and behaviour after a cold start. Vendor benchmarks can tell me what to investigate. They cannot decide what works for my data.

HydraDB's article on the [five primitives of a stateful context layer](https://hydradb.com/blog/stateful-agent-context-layer-primitives) helped me sharpen this test. Connected state is only one part. History, time, permission-aware sources, and combining several retrieval signals matter just as much. A graph without those pieces can still give an agent a connected version of the wrong context.

## The choice is really about the question

I began with a normal database because the application began with normal database questions. Known records. Known rules. Exact updates. Exact reports.

I added vector search when users stopped using the same words as the documents. It gave the application a way to find meaning without knowing the exact phrase.

I arrived at HydraDB when the answer stopped being a row or a passage and became a path through changing information: this customer uses this product, which depends on this service, which is blocked by this review, whose owner changed on Friday, according to this source, visible to this user.

That is the part I would send to the founder of HydraDB. The strongest case for HydraDB is not that tables are old or vectors are bad. Tables and vectors are useful. The case is that an agent often needs something neither one naturally provides alone: a current, connected, source-backed view of the world it is acting in.

For a billing system, I still want the row.

For a search box, I still want the similar passage.

For an agent deciding what is blocking Northstar right now, I want the path, the timeline, and the evidence together.
