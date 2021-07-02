@mamezou-tech/monorepo-update-checker
============================
[![CI](https://github.com/mamezou-tech/monorepo-update-checker/actions/workflows/CI.yml/badge.svg)](https://github.com/mamezou-tech/monorepo-update-checker/actions/workflows/CI.yml)
[![Maintainability Rating](https://sonarcloud.io/api/project_badges/measure?project=mamezou-tech_monorepo-update-checker&metric=sqale_rating)](https://sonarcloud.io/dashboard?id=mamezou-tech_monorepo-update-checker)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mamezou-tech_monorepo-update-checker&metric=alert_status)](https://sonarcloud.io/dashboard?id=mamezou-tech_monorepo-update-checker)

This action checks the change files for each monorepo project from commit_sha.
 
>- By setting `on.push.paths`, you can control the workflow launch of each monorepo project, but you cannot control the launch of jobs or steps. 
>- For example, start this JOB only when A Project has been updated.
>- By using this action, you can control such as skipping jobs and steps in projects that have not changed.
>- Confirm the change of `commit_sha` that triggered the workflow.

```yaml
name: main
on:
  push:
    branches: [ main ]
jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - name: Check for update in commit
        id: check
        uses: mamezou-tech/monorepo-update-checker@main
        with:
          projectPaths: |
            service1:test/service1
      - name: Get the output result
        run: echo "The result was ${{ toJSON(steps.check.outputs.results) }}"
```

## Inputs

### `projectPaths`

**Required**  
Define the project and project directory in monorepo you want to check for changes in the format below.

**format**  
`{projectName1}:{path1}/n{projectName2}:{path2},{path3}/n..`
- Connect the project name and project path with`:`
- If you have multiple paths in a project, use multiple paths
Connect with `,`
- Be sure to start a new line with `\n` between projects
- Do not put a blank space between `:` and `,` (trimmed but for safety)
- Do not enclose the string in `"` or `'`
- Since project information is treated as a multi-line character string, add `projectPaths:` to `|`.
  - It is a multi-line string because YAML arrays cannot be used due to the limitation of `@actions/core`.

Whether or not there is a change file under the specified path is determined by a simple prefix match with the path of the change file obtained from commit_sha.  

## Outputs

### `results` 
Returns JSON in JSON whether there were any modified files under the directory specified in [inputs](#inputs)

Example)
```JSON
{
  "service1":true,
  "service2":false
}
```

## Example usage
### Step control example
Example of skipping STEP if the project has not changed.

```yaml
name: workflow-sample1
on:
  push:
    branches: [ main ]
jobs:
  service1:
    runs-on: ubuntu-latest
    steps:
      - name: Check for update in commit
        id: check
        uses: mamezou-tech/monorepo-update-checkern@main
        with:
          projectPaths: |
            service1:test/service1,test/service1-option
            service2:test/service2
            service3:test/service3
      - name: serivce1 processing
      - if: ${{ fromJSON(steps.check.outputs.results).service1 }}
        run: echo execute processing of service1
      - name: serivce2 processing
      - if: ${{ fromJSON(steps.check.outputs.results).service2 }}
        run: echo execute processing of service2
      - name: serivce3 processing
      - if: ${{ fromJSON(steps.check.outputs.results).service3 }}
        run: echo execute processing of service3
```
- Performing the `monorepo-update-checker` action
  - Define the monorepo-update-checker action for `use` as in the example `check` step, and set the project name and project path to `projectPaths` as described in [projectPaths](#inputs).
- STEP control by `if`
  - Since the output of the `monorepo-update-checker` ACTIONS is returned in JSON format, convert it to a JSON object with the `fromJSON` function as in the example.
  - The `fromJSON` function argument` steps.check.outputs.results` is a reference to the `check` step [outputs](#outputs), and service1 is a reference to the check result.
  - The property name of this `service1` is the same as the project name defined in [projectPaths](#inputs).
  - As in the example, `if` refers to the property of `output` to control the execution of subsequent STEPs.

### Control example between JOBs
Example when you want to skip JOB of a project that has not changed  
- There are service1, service2 and service3 projects in monorepo, and workflow is started by push event.
- service2 and service3 start the JOB after the `service1` JOB, but this is an example of skipping the JOB if it has not changed.
 
```yaml
name: workflow-sample2
on:
  push:
    branches: [ main ]

jobs:
  check:
    runs-on: ubuntu-latest
    outputs:
      service1-updated: ${{ fromJSON(steps.check.outputs.results).service1 }}
      service2-updated: ${{ fromJSON(steps.check.outputs.results).service2 }}
      service3-updated: ${{ fromJSON(steps.check.outputs.results).service3 }}
    steps:
      - id: check
        uses: mamezou-tech/monorepo-update-checkern@main
        with:
          projectPaths: |
            service1:test/service1,test/service1-option
            service2:test/service2
            service3:test/service3
      - run: echo ${{toJSON(steps.check.outputs.results)}}

  service1:
    env:
      UPDATED: ${{ needs.check.outputs.service1-updated == 'true' }}
    runs-on: ubuntu-latest
    needs: check
    steps:
      # JOBs with successors need to be skipped at the level in step to complete the JOB normally
      - if: ${{ env.UPDATED == 'true' }}
        run: echo service1 is updated!

  service2:
    # There is no successor at the end, so there is no problem skipping at the JOB level
    if: ${{ needs.check.outputs.service2-updated == 'true' }}
    runs-on: ubuntu-latest
    needs: check
    steps:
      - run: echo ${{needs.check.outputs.service2-updated}}

  service3:
    # There is no successor at the end, so there is no problem skipping at the JOB level
    if: ${{ needs.check.outputs.service3-updated == 'true' }} 
    runs-on: ubuntu-latest
    needs: [check, service1]
    steps:
      - run: echo ${{needs.check.outputs.service3-updated}}
```
- Use the `monorepo-update-checker` ACTIONS on the first JOB of workflow to check for changes in monorepo.
  - Set the check result to the `output` property so that subsequent JOBs can see the check result, as in the `check` JOB example.
  - The example uses a property name such as `service1-updated`, but this can be any name.
  - The setting value of the `output` property is the same as [step-control-example](#step-control-example).
- The check result set in the `outputs` property of the preceding JOB can be referred from the `needs` property of the succeeding JOB.
  - Each JOB must specify `needs: check` so that it starts after the update check is performed.
- The example `service1` JOB starts a` service2` JOB, so even if there is no change, it is necessary to start the JOB and terminate it normally.
  - For this reason, it is controlled using `if` at each step instead of `if` control at the JOB level like `service2`JOB and `service3`JOB.

## Example Actions
refer to [workflow-sapmle1](https://github.com/mamezou-tech/monorepo-update-checker/actions/workflows/workflow-sample1.yml) and [workflow-sapmle2](https://github.com/mamezou-tech/monorepo-update-checker/actions/workflows/workflow-sample2.yml).

## Note
Do not use it for anything other than push events. Set all update results to true if the start event is not a push event.

## TODO
+ [ ] Allow `*` to be used in path descriptions as well as `on.push.paths`
