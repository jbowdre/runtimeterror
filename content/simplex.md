+++
comments = false
toc = false
usePageBundles = false
showDate = false
showShare = false
showReadTime = false
timeless = true
title = "SimpleX Chat"
+++
*You can **[contact me on SimpleX Chat](https://l.runtimeterror.dev/simplex-chat-invite)** by clicking that link or scanning the QR code below.*

![QR code](/images/simplex-invite.png)

[SimpleX Chat](https://simplex.chat/) is a secure messaging solution with a strong emphasis on user privacy. It's (naturally) end-to-end encrypted, doesn't require (or collect) *any* information about you in order to sign up, doesn't use any persistent user identifiers (not even a randomly-generated one), is fully decentralized, and is *not* affiliated with any cryptocurrency project/scam.

Incoming messages are routed through a pool of servers so that your conversations don't all follow the same path - and no server knows anything about conversations that aren't routed through it. Servers only hold your messages long enough to ensure they get to you, and those messages exist only in the encrypted database on your device once they've been delivered. (Fortunately, SimpleX makes it easy to back up that database and restore it on a new device so you don't lose any messages or contacts.)

The app is also packed with other features like disappearing messages, encrypted file transfers, encrypted voice messages, encrypted audio and video calls, decentralized private groups, and a cool incognito mode which connects new conversations to a randomly-generated profile instead of your primary one. There's even a [CLI client](https://github.com/simplex-chat/simplex-chat/blob/stable/docs/CLI.md)!

## Servers
You can easily host your own [simplexmq server](https://github.com/simplex-chat/simplexmq) for handling your inbound message queue, and I've done just that; in fact, I've deployed three! And, as one of my closest internet friends, *you're welcome to use them as well.*

Just add these in the SimpleX app at **Settings > Network & servers > SMP servers > + Add server...**. Enable the option to use them for new connections, and they'll be added to the pool used for incoming messages in new conversations. If you want to use them immediately for existing conversations, go into each conversation's options menu and use the **Switch receiving address** option. You can also *disable* the option to use the default servers for new conversations if you only want messages to be routed through specific servers, but that does increase the likelikhood of concurrent conversations being routed the same way. More servers, more path options, less metadata in any one place.

---
![QR code](/images/smp-vpota-to.png)

`smp://kYx5LmVD9FMM8hJN4BQqL4WmeUNZn8ipXsX2UkBoiHE=@smp.vpota.to`

| | |
| --- | --- |
| [![Uptime](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fjbowdre%2Fupptime%2Fmaster%2Fapi%2Fsmp-vpota-to-5223%2Fuptime.json)](https://status.runtimeterror.dev/history/smp-vpota-to-5223) | [[netdata](https://l.runtimeterror.dev/smp_status)] |

---

![QR code](/images/smp1-vpota-to.png)

`smp://TbUrGydawdVKID0Lvix14UkaN-WarFgqXx4kaEG8Trw=@smp1.vpota.to`

| | |
| --- | --- |
| [![Uptime](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fjbowdre%2Fupptime%2Fmaster%2Fapi%2Fsmp1-vpota-to-5223%2Fuptime.json)](https://status.runtimeterror.dev/history/smp1-vpota-to-5223) | [[netdata](https://l.runtimeterror.dev/smp1_status)] |

---

![QR code](/images/smp2-vpota-to.png)

`smp://tNfQisxTQ9MhKpFDTbx9RnjgWigtxF1a26jroy5-rR4=@smp2.vpota.to`

| | |
| --- | --- |
| [![Uptime](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2Fjbowdre%2Fupptime%2Fmaster%2Fapi%2Fsmp2-vpota-to-5223%2Fuptime.json)](https://status.runtimeterror.dev/history/smp2-vpota-to-5223) | [[netdata](https://l.runtimeterror.dev/smp2_status)] |
