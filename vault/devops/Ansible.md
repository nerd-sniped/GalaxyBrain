---
publish: true
title: "Ansible"
tags: [devops/iac, devops]
graph:
  shape: box
  color: "#cc0000"
---

# Ansible

Ansible is an agentless automation tool using YAML playbooks.

```yaml
- name: Install nginx
  apt:
    name: nginx
    state: present
```

See [[Terraform]] · [[Infrastructure as Code]] · [[DevOps Hub]].
