---
title: "Enabling FIPS Compliance Fixes Aria Lifecycle 8.14"
date: 2024-01-19
# lastmod: 2024-01-19
description: "Never in my life have I seen enabling FIPS *fix* a problem - until now."
featured: false
categories: VMware
tags:
  - vmware
---
This week, VMware posted [VMSA-2024-0001](https://www.vmware.com/security/advisories/VMSA-2024-0001.html) which details a critical (9.9/10) vulnerability in <s>vRealize</s> *Aria* Automation. While working to get our environment patched, I ran into an interesting error on our Aria Lifecycle appliance:

```log
Error Code: LCMVRAVACONFIG590024
VMware Aria Automation hostname is not valid or unable to run the product specific commands via SSH on the host. Check if VMware Aria Automation is up and running.
VMware Aria Automation hostname is not valid or unable to run the product specific commands via SSH on the host. Check if VMware Aria Automation is up and running.
com.vmware.vrealize.lcm.drivers.vra80.exception.VraVaProductNotFoundException: Either provided hostname: <VMwareAriaAutomationFQDN> is not a valid VMware Aria Automation hostname or unable to run the product specific commands via SSH on the host.
  at com.vmware.vrealize.lcm.drivers.vra80.helpers.VraPreludeInstallHelper.getVraFullVersion(VraPreludeInstallHelper.java:970)
  at com.vmware.vrealize.lcm.drivers.vra80.helpers.VraPreludeInstallHelper.checkVraApplianceAndVersion(VraPreludeInstallHelper.java:978)
  at com.vmware.vrealize.lcm.drivers.vra80.helpers.VraPreludeInstallHelper.getVraProductDetails(VraPreludeInstallHelper.java:754)
  at com.vmware.vrealize.lcm.plugin.core.vra80.task.VraVaImportEnvironmentTask.execute(VraVaImportEnvironmentTask.java:145)
  at com.vmware.vrealize.lcm.platform.automata.service.Task.retry(Task.java:158)
  at com.vmware.vrealize.lcm.automata.core.TaskThread.run(TaskThread.java:60)
  at java.base/java.util.concurrent.ThreadPoolExecutor.runWorker(Unknown Source)
  at java.base/java.util.concurrent.ThreadPoolExecutor$Worker.run(Unknown Source)
  at java.base/java.lang.Thread.run(Unknown Source)
```

Digging further into the appliance logs revealed some more details:
```log
Session.connect: java.security.spec.InvalidKeySpecException: key spec not recognized
```

That seems like a much more insightful error than "the hostname is not valid, dummy."

Anyhoo, searching for the error took me to a VMware KB on the subject:
- [VMware Aria Suite Lifecycle 8.14 Patch 1 Day 2 operations fail for VMware Aria Automation with error code LCMVRAVACONFIG590024 (96243)](https://kb.vmware.com/s/article/96243)

> After applying VMware Aria Suite Lifecycle 8.14 Patch 1, you may encounter deployment and day-2 operation failures, attributed to the elimination of weak algorithms in Suite Lifecycle. To prevent such issues, it is recommended to either turn on FIPS in VMware Aria Suite Lifecycle or implement the specified workarounds on other VMware Aria Products, as outlined in the article Steps for Removing SHA1 weak Algorithms/Ciphers from all VMware Aria Products.

That's right. According to the KB, the solution for the untrusted encryption algorithms is to *enable* FIPS compliance. I was skeptical: I've never seen FIPS enforcement fix problems, it always causes them.

But I gave it a shot, and *holy crap it actually worked!* Enabling FIPS compliance on the Aria Lifecycle appliance got things going again.

I feel like I've seen everything now.