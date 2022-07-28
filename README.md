## About
This project is a simple Proof of Concept to assess how [NestJS](https://nestjs.com/) copes with Kubernetes graceful and forcible types of shutdown.

## Requirements
In order to test it locally, Docker and Kubernetes are required (tip: install Docker Desktop and activate its local k8s cluster on `Settings > Kubernetes > Enable Kubernetes`).

## Installation & Setup
Install the dependencies:
```bash
npm i
```
Run the server:
```bash
npm run start
```
Make a test request:
```bash
curl -w "\n" -X GET 'http://localhost:3000/'
```
As configured in [app.service.ts](src/app.service.ts#L15), the application will apply a delay before responding with the string `Hello World!`.

Build the Docker image:
```bash
docker build . -t poc-nestjs
```
Create the Kubernetes deployment:
```bash
kubectl apply -f deployment.yaml
```

## Findings

### Running the server with 'enableShutdownHooks' set to FALSE (default)
By not calling `app.enableShutdownHooks()` (i.e., not enabling NestJS shutdown hooks), the default behaviour of the application is to receive a signal and shutdown immediatly. [Details here](images/disableShutdownHooks.png).

How to test:
- Comment out the line where the hooks are enabled in [main](src/main.ts#L10)
- Run the application
- Make a test request as mentioned above
- Send a SIGTERM to the process running the server
```bash
kill -s SIGTERM <pid>
# or
kill -15 <pid>
```

### Running the server with 'enableShutdownHooks' set to TRUE
On the other hand, by explicitly calling `app.enableShutdownHooks()` (i.e., enabling NestJS shutdown hooks), when the application receives a signal it will finish processing the current requests and only afterwards it will shutdown. [Details here](images/enableShutdownHooks.png).

How to test:
- Repeat all the steps listed on the prior section

NOTE: for the following scenarios, the shutdown hooks were always enabled.

### Running on k8s WITHOUT reaching the Pods termination grace period (shutdown hooks enabled)
In the event of a scale down (like the one triggered by HPA - HorizontalPodAutoscaler, or in the case of rolling update during a deploy), Kubernetes will send a SIGTERM signal to the application and, after the termination grace period has passed, it executes a forcible shutdown. The scenario where all the current requests are finished before termination grace period ends are processed successfully. [Details here](images/shutdownKubernetes.png).

How to test:
- Change the delay time in [app.service.ts](src/app.service.ts#L15) to a value SMALLER than the Pods termination grace period set in [deployment.yaml](deployment.yaml#L30)
- Create the deployment on k8s as instructed above (rebuild the Docker image and recreate the deployment so the changes are reflected to the running server)
- Watch out for the logs
```bash
kubectl logs -l app=poc-nestjs
```
- Create a `port-forward` to the running pod on k8s
```bash
kubectl port-forward deploy/poc-nestjs-deployment 3000:3000
```
- Make a test request
- Scale down the pod replicas
```bash
kubectl scale --replicas=0 -f deployment.yaml
```

### Running on k8s AND reaching the Pods termination grace period (shutdown hooks enabled)
The scenario where some of the current requests are not finished before termination grace period expires will end in error. [Details here](images/forceShutdownKubernetes.png).

How to test:
- Change the delay time in [app.service.ts](src/app.service.ts#L15) to a value BIGGER than the Pods termination grace period set in [deployment.yaml](deployment.yaml#L30)
- Repeat all the steps from the previous scenario

### Running on k8s as a subprocess from container's entrypoint
This last sceneario is an edge case, but still worth to be evaluated. All tests up to this point were based in this [Dockerfile](Dockerfile), but this test case is based in [Dockerfile.start-script](Dockerfile.start-script). The main difference is that instead of using the original container entrypoint (the `node` command), the container will execute a shell script, which, in turn, will call the `node` command as a subprocess. The result is that when Kubernetes sends a SIGTERM to the Pod, the signal is not propagated to the child process, preventing the server to be notified of an upcoming shutdown. [Details here](images/shutdownParentScript.png).

How to test:
- Rebuild the docker image using the alternative Dockerfile
```bash
docker build . -f Dockerfile.start-script -t poc-nestjs
```
- Recreate the deployment on k8s (so as to use the updated docker image)
- Repeat all the steps from the previous scenario