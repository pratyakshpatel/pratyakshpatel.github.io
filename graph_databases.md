# I Started With a Table

*Graph databases, relational databases, and the questions that made the difference clearer to me.*

For a long time, a dataset meant a table to me. One row per observation, one column per feature, and usually a target somewhere on the right. I liked statistics, I liked classical machine learning, and if somebody handed me a CSV, I was probably going to try a tree on it. I have already written quite a lot about that particular habit.

Then I worked on next-event prediction in football for my bachelor's thesis. A pass still arrived as a row, but understanding it meant looking around that row. Who had the ball? Who was available? Where was the pressure coming from? What had happened just before this? The same player could make the same pass from the same place and mean something quite different because the other players had moved.

That work made me comfortable thinking in graphs. It did not automatically teach me anything about graph databases. A graph neural network learns from connected data. A graph database stores and queries connected data. I had spent time with the first, and I wanted to understand the second without assuming that my affection for graphs was already an argument for using one.

The question sounds simple enough: why would I use a graph database instead of a normal database?

By normal, I mean a relational database such as PostgreSQL, where we usually organise records into tables. There are other kinds of databases too, but this is the comparison I wanted to sit with. I was less interested in a list of features than in the point at which I would actually make a different choice.

So let me build a small, imaginary company and follow its questions. I find these things easier when the example stays with me long enough to become inconvenient.

## A table is a very reasonable place to begin

Our company sells software. It has customers, employees, projects, and invoices. One customer is Northstar. One project is Ledger, a product the company is building. One employee, Mira, looks after it.

I would happily put these into tables. The customer table holds customer details. The employee table holds employee details. The project table records Ledger and the ID of its owner. An invoice records the customer it belongs to and the amount due.

That little ID is already a relationship. The project does not need a fresh copy of Mira's name, email, and department every time we mention her. It can refer to her employee record. If her email changes, I can change it in one place.

When I ask who owns Ledger, the database matches the owner's ID in the project record with the corresponding employee. Combining matching records is called a join. It is ordinary database work, and PostgreSQL's [introduction to joins](https://www.postgresql.org/docs/current/tutorial-join.html) explains it through exactly this kind of matching.

This is why I find the claim that tables cannot handle relationships confusing. We have barely started and our tables already contain several of them.

There are useful rules here too. The database can reject an invoice that points to a customer who does not exist. PostgreSQL calls these [foreign key constraints](https://www.postgresql.org/docs/current/tutorial-fk.html). If I need several updates to succeed together, I can group them into a [transaction](https://www.postgresql.org/docs/current/tutorial-transactions.html), so a failure does not leave half the work committed.

For questions such as how much Northstar owes, which invoices are overdue, or how many projects Mira owns, this arrangement feels natural. The team understands it. The reports are straightforward. I have no reason to introduce another database because I can draw an arrow between two records.

I want to give this starting point its full credit. A lot of useful software can stay here for a very long time.

Even as the company grows, many questions keep the same shape. Finance wants the unpaid total for each customer, grouped by month. I can describe which records to include and how to add them up. A graph database may support that work too, but I would need a reason to move a report that the existing system already handles well. More records alone would not tell me that the model had stopped fitting the problem.

## Then somebody asks the next question

Ledger uses an internal billing service. That service depends on a payment provider. Another customer uses a different product that also relies on the same provider.

Now imagine the provider has an outage. Somebody asks which customers might be affected.

I start at the provider, find the services that depend on it, find the products using those services, and finally find the customers using those products. The answer needs several connected facts. Looking up the provider's own record tells me very little.

I can still do this with tables. I could have a table of services and a separate table recording dependencies: this service depends on that service. Another table connects customers to products. I join the records together and follow the chain.

But the next outage might involve a longer chain. Billing depends on another internal service, which depends on the payment provider. I would like to keep following dependencies until I have found everything relevant, even when I did not know the number of steps beforehand.

SQL has a way to do this too. PostgreSQL supports [recursive queries](https://www.postgresql.org/docs/current/queries-with.html), which can repeatedly use the records found in one step to discover records in the next. Its documentation even uses the example of finding the direct and indirect parts of a product.

So the question is becoming more specific. Both approaches can represent the facts. I am asking which makes these repeated journeys easier to express, run, and maintain.

The journey also needs rules. A service might depend on two others. Several routes might lead to the same customer. Bad data might even describe a loop. I have to decide whether I want every route or only the list of affected customers, and how I avoid going round forever.

These details matter because “find everything connected” is usually much broader than the question somebody intended to ask.

There is a business detail as well. A dependency tells me where an outage could spread. It does not prove that every connected customer has lost service. One product may have a backup provider. Another may use Billing only for a feature that nobody is using right now. To answer the stronger question, I need those facts too. I would rather return a list of potentially affected customers with the relevant routes than quietly turn a dependency map into a claim about what actually happened.

## What I would write down as a graph

In a graph database, I can make Mira, Ledger, Billing, and Northstar individual things, then store named connections between them. Mira owns Ledger. Ledger depends on Billing. Northstar uses Ledger.

The things are usually called nodes, and the connections are called edges or relationships. That is the basic vocabulary. The [property graph model](https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/) also lets me keep details on both: Ledger can have a launch date, and Mira's ownership can have a start date.

The names of the connections do real work. Mira mentioning Ledger in a conversation is different from Mira owning Ledger. Ledger depending on Billing is different from Billing depending on Ledger. I cannot replace all of those with a vague “related to” and expect the database to recover what I meant later.

For the outage question, I can describe a route through dependency relationships and then through customer relationships. The database gives me a language built around finding those patterns. The route I am thinking about and the route I am asking for become easier to compare.

I like that because it makes mistakes more visible to me. If I accidentally follow people who discussed a project when I needed people responsible for it, I can point to the wrong kind of connection.

There is still modelling work. I need to decide what counts as a project, whether a project can have two owners, and how temporary responsibility should be recorded. I need consistent names and stable identities. A graph does not relieve me of those decisions.

Suppose Mira owns the product but a security lead must approve changes involving payment details. Those are separate responsibilities. I would store them separately instead of hoping that an assistant understands “owner” broadly enough to guess the approval process. And when an actual approval happens, I may want a record of that event: the particular change, the person approving it, and the policy that applied. The graph becomes useful through these specific choices about what its connections mean.

And I could write every one of these relationships as rows in a table. What has changed is the organisation of the model and the way I work with it. I am giving the connections a more direct place in the questions the application asks.

## Following a connection still costs something

I initially found it tempting to stop at the picture. Graphs look connected, our problem is connected, therefore the graph database should be faster. That skips the part I actually need to understand.

Databases do work underneath their query languages. PostgreSQL can use [indexes](https://www.postgresql.org/docs/current/indexes-intro.html) to locate matching records efficiently, including records involved in joins. It does not have to read every employee every time I ask about Mira. A poorly chosen index can make a sensible table design look much worse than it needs to.

Graph engines can maintain structures designed for moving from a thing to its neighbours. That can help when the application repeatedly follows connections through a small, relevant part of a larger dataset. But different graph engines organise that work differently. The arrows in a diagram do not tell me what is on disk or how much information has to move over a network.

There is another problem hiding in our example. Suppose Billing serves almost every product in the company. Starting there could lead to an enormous amount of work. Twenty connections followed by twenty more and then twenty more could produce eight thousand candidate routes before I have gone very far. That is an illustrative count, but the underlying difficulty is real.

Neo4j's documentation on [paths of varying lengths](https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-paths/) warns about this: broad patterns and long paths can match very large numbers of possibilities. Limits and conditions help exclude work that the answer does not need.

So I would ask a tighter question. Follow active dependencies in production. Stop after a sensible number of steps, or use a search designed to collect reachable customers without listing every possible route. Keep the evidence I need to explain the result.

This is where my enthusiasm becomes useful to me only if I measure it. A shorter graph query may be easier to read while still being expensive to execute. I want both the readable question and a reasonable amount of work underneath it.

## Now give the company an AI assistant

The company decides to let an assistant answer questions from its documents and conversations. Somebody asks who should approve a change to Ledger.

There is an old planning document with Mira's name in it. There is a recent conversation about a handover. There is a team policy describing who approves changes to services shared by several products. All three may matter.

Searching by meaning can be very helpful here. A question about approvals should be able to find a document about responsibility, even when the words differ. Vector search does this by representing content as lists of numbers and comparing those representations. PostgreSQL can support that through [pgvector](https://github.com/pgvector/pgvector), so this capability does not require abandoning our existing database.

But a passage that resembles the question is only a possible starting point. The old planning document might match beautifully and still name the wrong owner. A recent handover message might be brief, badly written, and much more important.

I would want the assistant to find Ledger, follow its current ownership, check the relevant approval rule, and retrieve the source of the handover. Search can help locate the starting material. The stored connections can help assemble the rest.

That is a design I would test, rather than a guarantee attached to the word graph. A carefully built system using tables, search, and good filters may answer the question perfectly. A badly built graph may connect the wrong Mira to the wrong project and confidently return nonsense.

Working on agentic AI makes me interested in this distinction. The assistant can phrase a response well and still be missing one small fact that changes the answer. I want to inspect how it obtained that fact. In our imaginary company, “Mira appears in several relevant documents” is much weaker evidence than “this recorded handover makes Arjun responsible from Friday.”

The useful result is an answer whose supporting records I can actually follow.

I would also separate the work I ask the database to do from the work I ask the language model to do. Finding the recorded owner is a precise lookup. Explaining a messy discussion may require interpretation. If the owner is available directly, I would retrieve that record and let the model explain it alongside the supporting material. I do not need to ask the model to reconstruct every fact from prose each time somebody asks a question.

## Friday changes the answer

Let the handover happen. Mira moves to another team, and Arjun takes over Ledger on Friday.

If I replace Mira's name with Arjun's everywhere, I can answer who owns Ledger now. But next month somebody may ask why Mira approved a change on Thursday. I need the earlier state too.

I would record when each period of responsibility began and ended. I would also distinguish the day the handover became effective from the day our system learned about it. A message imported on Monday might describe a change that happened on Friday. Those dates answer different questions.

This is possible in tables and in graphs. A graph makes the ownership relationship an obvious place to attach time, but it does not invent the history for me. If I only keep the latest owner, the earlier answer is gone in either system.

The same care applies to evidence. “Arjun will probably take this over” should not quietly become a confirmed ownership change. I would want a connection back to the message or record supporting the claim, and a way to distinguish an inference from an approved fact.

Names create another small mess. A chat says “Mira,” a document says “M. Shah,” and an employee record has a full name. Before I connect their facts, I need evidence that these refer to the same person. If I merge two people by mistake, following more connections only spreads the error further.

Access matters too. If the assistant cannot show an internal document to a user, it should not reveal the document's contents indirectly through its answer. Any connected context I retrieve has to respect the user's access.

Sometimes the records will disagree. The project tracker may show Arjun while a planning page still shows Mira. I would want to keep that disagreement visible until the system has a rule or evidence for resolving it. Returning an uncertain answer can be the correct behaviour. A tidy graph with one confident owner is less useful if that confidence came from silently discarding the conflicting record.

I keep returning to the handover because it exposes what I actually mean by memory. I want the system to preserve enough context to answer a changing question correctly: who was responsible, when they were responsible, and what evidence supports that answer. Storing more text helps only when I can recover the right part of that history.

## Where HydraDB caught my attention

This is the point at which HydraDB became interesting to me. Its [product overview](https://hydradb.com/ai) separates two ways of using it: an open-source graph engine and a hosted context API for knowledge and memory. I think that distinction is useful because running graph queries and turning workplace material into useful context involve different amounts of work.

The hosted [introduction](https://docs.hydradb.com/get-started/v2/introduction) describes taking documents, memories, and connected sources, building a context graph, and indexing it in the background. That addresses the step between having a pile of company material and having relationships an application can query.

The engine's [architecture document](https://github.com/hydra-db/hydradb/blob/main/architecture.md) describes durable graph data in S3-compatible object storage, with separate query and indexing processes and local memory and SSD caches. In everyday terms, the machines answering questions can keep useful local copies while the durable records live in shared storage.

I read that as a design intended to let storage and query capacity grow separately. It also gives me concrete things to investigate. How does a query behave when the useful data is already cached? What happens after a restart, when it must be fetched again? How quickly can I query a relationship after changing it?

Those questions follow directly from the design. I have not run a comparison here, so I would keep response-time and cost claims for an experiment that can actually support them.

For our company, I would start with the Ledger handover. Can the system find the current approver, explain Thursday's approval, and return the source for each? Then I would change the records and ask again. That would tell me much more about whether it fits my application than importing all the documents and being impressed that it returns fluent answers.

## The comparison I would actually run

Before choosing anything, I would collect questions from the application. Who owns Ledger? Which customers could an outage affect? Why was a change approved? Which approval is still valid after Friday's handover?

I would include the simple work too. The company still needs overdue invoices, monthly totals, and customer reports. If most of its work looks like that, my reason for adding a graph database has to be strong enough to justify another system.

Then I would build a fair version of each approach. The relational version gets sensible tables, indexes, and recursive queries where needed. The graph version gets named relationships, suitable indexes, and searches with sensible limits. Both get the same underlying facts, permissions, and update history.

I would measure whether the answers are correct before celebrating their speed. If one system returns the current owner and the other returns everyone who ever mentioned Ledger, they have answered different questions. A fast wrong answer cannot win that comparison.

After that, I would look at response times under normal and busy use, the slower requests, storage, and the effort needed to keep information current. I would include highly connected services such as Billing, because an easy example with three connections tells me little about the awkward ones.

I would also change the data during the test. A customer leaves. A dependency disappears. Arjun hands Ledger to somebody else. The assistant should stop relying on an old fact when the application requires the new one.

Keeping two databases creates another responsibility. If PostgreSQL stores the official ownership and a graph stores a connected copy, something must carry changes between them. I need to know what happens when that process falls behind or fails halfway through. The graph's usefulness depends partly on the reliability of that update path.

This is why I can imagine choosing either approach. For a smaller application with predictable questions, I would be comfortable beginning with PostgreSQL. For an application whose daily work involves changing chains of dependencies, responsibility, and evidence, a graph database deserves a serious trial. The decision should become clearer as I examine the work the system repeatedly does.

## Back to the football pitch

I think football made me receptive to graphs because a player's individual record always felt incomplete. A completed pass tells me something. Understanding the available options, the pressure, and the preceding actions tells me much more about that pass.

But the match data can still live in tables. Drawing the players as nodes does not make those tables wrong. It gives me another useful way to organise a particular question.

I arrived at much the same place with databases. I would choose based on the questions I need to answer, the work required to answer them, and the effort required to keep the answers correct as things change.

The question I started with was whether a graph database was better than a normal database. After following Ledger through an outage and a handover, I have a more practical question to ask: how often does my application need to begin with one fact and keep following its connections?

If that happens all day, I want to take the graph seriously. And when somebody asks who owns Ledger on Monday morning, I want to be able to show them exactly why the answer is Arjun.
