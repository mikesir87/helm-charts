const {getChartManifests, validateRequiredLabels} = require("./helpers");

let manifestObjects;

beforeAll(() => {
    manifestObjects = getChartManifests("dogs-vs-cats");
});

describe("overall resource generation", () => {
    it("generated a Deployment per service", () => {
        let deployments = manifestObjects.filter(o => o.kind === "Deployment");
        expect(deployments.length).toBe(5);
        expect(deployments.map(d => d.metadata.name)).toEqual(jasmine.arrayContaining(["redis", "db", "vote", "result", "worker"]));
    });

    it("generated a ServiceAccount per service", () => {
        let services = manifestObjects.filter(o => o.kind === "ServiceAccount");
        expect(services.length).toBe(5);
        expect(services.map(d => d.metadata.name)).toEqual(jasmine.arrayContaining(["deployment-redis", "deployment-db", "deployment-vote", "deployment-result", "deployment-worker"]));
    });

    it("generated a Service for each service that exposes ports", () => {
        expect(manifestObjects.filter(o => o.kind === "Service").length).toBe(4);
    });

    it("generated an Ingress for each service that has ports with x-ingress", () => {
        expect(manifestObjects.filter(o => o.kind === "Ingress").length).toBe(2);
    });
});

describe("validate the redis service", () => {
    let redisDeployment, redisService;

    beforeAll(() => {
        redisDeployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "redis");
        redisService = manifestObjects.find(o => o.kind === "Service" && o.metadata.name === "redis");
    });

    describe("generated deployment validations", () => {
        it("has the correct container image specified", () => {
            expect(redisDeployment.props.spec.template.spec.containers[0].image).toEqual("redis:alpine");
        });

        it("set the command correctly for the redis service", () => {
            let containerArgs = redisDeployment.props.spec.template.spec.containers[0].args;
            expect(containerArgs).toEqual(["redis-server", "--appendonly", "yes"]);
        });

        it("added the container port to the deployment", () => {
            let containerPorts = redisDeployment.props.spec.template.spec.containers[0].ports;
            expect(containerPorts).toBeDefined();
            expect(containerPorts.length).toBe(1);
            expect(containerPorts[0].containerPort).toBe(6379);
        });
    });

    describe("generated service validations", () => {
        it("created a ClusterIP service for the service", () => {
            expect(redisService.props.spec.type).toEqual("ClusterIP");
        });

        it("set the ports correctly", () => {
            const ports = redisService.props.spec.ports;
            expect(ports).toBeDefined();
            expect(ports.length).toBe(1);
            expect(ports[0].port).toBe(6379);
            expect(ports[0].targetPort).toBe(6379);
        });
    });
});

describe("validate the db service", () => {
    let dbDeployment, dbService;

    beforeAll(() => {
        dbDeployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "db");
        dbService = manifestObjects.find(o => o.kind === "Service" && o.metadata.name === "db");
    });

    describe("generated deployment validations", () => {
        it("has the correct container image specified", () => {
            expect(dbDeployment.props.spec.template.spec.containers[0].image).toEqual("postgres:9.6");
        });

        it("added the container port to the deployment", () => {
            let containerPorts = dbDeployment.props.spec.template.spec.containers[0].ports;
            expect(containerPorts).toBeDefined();
            expect(containerPorts.length).toBe(1);
            expect(containerPorts[0].containerPort).toBe(5432);
        });

        it("added the environment variables to the deployment", () => {
            let envVars = dbDeployment.props.spec.template.spec.containers[0].env;
            expect(envVars).toBeDefined();
            expect(envVars.length).toBe(2);

            // Validate without worrying about what order they might be rendered
            expect(envVars.find(e => e.name === "POSTGRES_USER" && e.value === "postgres")).toBeDefined();
            expect(envVars.find(e => e.name === "POSTGRES_PASSWORD" && e.value === "postgres")).toBeDefined();
        });
    });

    describe("generated service validations", () => {
        it("created a ClusterIP service for the service", () => {
            expect(dbService.props.spec.type).toEqual("ClusterIP");
        });

        it("set the ports correctly", () => {
            const ports = dbService.props.spec.ports;
            expect(ports).toBeDefined();
            expect(ports.length).toBe(1);
            expect(ports[0].port).toBe(5432);
            expect(ports[0].targetPort).toBe(5432);
        });
    });
});

describe("vote service validations", () => {
    let voteDeployment, voteService, voteIngress;

    beforeAll(() => {
        voteDeployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "vote");
        voteService = manifestObjects.find(o => o.kind === "Service" && o.metadata.name === "vote");
        voteIngress = manifestObjects.find(o => o.kind === "Ingress" && o.metadata.name === "vote");
    });

    describe("generated deployment validations", () => {
        it("has the correct container image specified", () => {
            expect(voteDeployment.props.spec.template.spec.containers[0].image).toEqual("dockersamples/examplevotingapp_vote:before");
        });

        it("has service-level labels defined on the pod spec", () => {
            const podSpecLabels = voteDeployment.props.spec.template.metadata.labels;
            expect(podSpecLabels["example.com/container-only"]).toBeDefined();
            expect(podSpecLabels["example.com/container-only2"]).toBeDefined();
            expect(podSpecLabels["example.com/container-only"]).toEqual("foobar");
            expect(podSpecLabels["example.com/container-only2"]).toEqual("foobar2");
        });

        it("doesn't have service-level labels on the deployment spec", () => {
            const deploymentLabels = voteDeployment.metadata.labels;
            expect(deploymentLabels["example.com/container-only"]).not.toBeDefined();
            expect(deploymentLabels["example.com/container-only2"]).not.toBeDefined();
        });

        it("does have deploy-level labels on the deployment spec", () => {
            const deploymentLabels = voteDeployment.metadata.labels;
            expect(deploymentLabels["example.com/foo"]).toBeDefined();
            expect(deploymentLabels["example.com/foo"]).toEqual("bar");
        });

        it("specifies replica count", () => {
            expect(voteDeployment.props.spec.replicas).toBe(2);
        });
    });

    describe("generated service validations", () => {
        it("created a ClusterIP service for the service", () => {
            expect(voteService.props.spec.type).toEqual("ClusterIP");
        });

        it("set the ports correctly", () => {
            const ports = voteService.props.spec.ports;
            expect(ports).toBeDefined();
            expect(ports.length).toBe(1);
            expect(ports[0].port).toBe(80);
            expect(ports[0].targetPort).toBe(80);
        });

        it("has the deploy-level labels", () => {
            const serviceLabels = voteService.metadata.labels;
            expect(serviceLabels["example.com/foo"]).toBeDefined();
            expect(serviceLabels["example.com/foo"]).toEqual("bar");
        });
    });

    describe("generated ingress validations", () => {
        it("has the right host", () => {
            expect(voteIngress.props.spec.rules.length).toBe(1);

            let rule = voteIngress.props.spec.rules[0];
            expect(rule.host).toBe("vote.localhost");
            expect(rule.http.paths.length).toBe(1);
            expect(rule.http.paths[0].path).toBe("/");
            expect(rule.http.paths[0].backend.service.name).toBe("vote");
            expect(rule.http.paths[0].backend.service.port.number).toBe(80);
        });
    });
});

describe("result service validations", () => {
    let resultDeployment, resultService, resultIngress;

    beforeAll(() => {
        resultDeployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "result");
        resultService = manifestObjects.find(o => o.kind === "Service" && o.metadata.name === "result");
        resultIngress = manifestObjects.find(o => o.kind === "Ingress" && o.metadata.name === "result");
    });

    describe("generated deployment validations", () => {
        it("has the correct container image specified", () => {
            expect(resultDeployment.props.spec.template.spec.containers[0].image).toEqual("dockersamples/examplevotingapp_result");
        });

        it("specifies replica count", () => {
            expect(resultDeployment.props.spec.replicas).toBe(1);
        });
    });

    describe("generated service validations", () => {
        it("created a ClusterIP service for the service", () => {
            expect(resultService.props.spec.type).toEqual("ClusterIP");
        });

        it("set the ports correctly", () => {
            const ports = resultService.props.spec.ports;
            expect(ports).toBeDefined();
            expect(ports.length).toBe(1);
            expect(ports[0].port).toBe(80);
            expect(ports[0].targetPort).toBe(80);
        });
    });

    describe("generated ingress validations", () => {
        it("has the right host", () => {
            expect(resultIngress.props.spec.rules.length).toBe(1);

            let rule = resultIngress.props.spec.rules[0];
            expect(rule.host).toBe("results.localhost");
            expect(rule.http.paths.length).toBe(1);
            expect(rule.http.paths[0].path).toBe("/");
            expect(rule.http.paths[0].backend.service.name).toBe("result");
            expect(rule.http.paths[0].backend.service.port.number).toBe(80);
        });
    });
});



describe("worker service validations", () => {
    let workerDeployment;

    beforeAll(() => {
        workerDeployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "worker");
    });

    describe("generated deployment validations", () => {
        it("has the correct container image specified", () => {
            expect(workerDeployment.props.spec.template.spec.containers[0].image).toEqual("mikesir87/votingapp-worker");
        });

        it("specifies replica count", () => {
            expect(workerDeployment.props.spec.replicas).toBe(2);
        });
    });
});

