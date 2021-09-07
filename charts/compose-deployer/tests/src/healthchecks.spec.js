const {getChartManifests, validateRequiredLabels} = require("./helpers");

let manifestObjects;

beforeAll(() => {
    manifestObjects = getChartManifests("healthchecks");
});

it("generated four resources", () => {
    expect(manifestObjects.length).toBe(4);
    expect(manifestObjects.filter(o => o.kind === "Deployment").length).toBe(2);
    expect(manifestObjects.filter(o => o.kind === "ServiceAccount").length).toBe(2);
})

it("has all of the required labels", () => {
    validateRequiredLabels(manifestObjects);
});

describe("httpGet checks", () => {
    let deployment;

    beforeAll(() => {
        deployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "using-http").props;
    });

    it("defines a livenessProbe using httpGet", () => {
        const container = deployment.spec.template.spec.containers[0];
        let probe = container.livenessProbe;

        expect(probe).toBeDefined();
        expect(probe.httpGet).toBeDefined();
        expect(probe.httpGet.path).toEqual("/status");
        expect(probe.httpGet.port).toEqual(80);
    });

    it("defines a readinessProbe using httpGet", () => {
        const container = deployment.spec.template.spec.containers[0];
        let probe = container.readinessProbe;

        expect(probe).toBeDefined();
        expect(probe.httpGet).toBeDefined();
        expect(probe.httpGet.path).toEqual("/status");
        expect(probe.httpGet.port).toEqual(80);
    });
});

describe("cmd-based healthchecks", () => {
    let deployment;

    beforeAll(() => {
        deployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "using-exec").props;
    });

    it("defines a livenessProbe using exec", () => {
        const container = deployment.spec.template.spec.containers[0];
        let probe = container.livenessProbe;

        expect(probe).toBeDefined();
        expect(probe.exec).toBeDefined();
        expect(probe.exec.command).toEqual(["curl", "-f", "http://localhost"]);
        expect(probe.initialDelaySeconds).toEqual(5);
        expect(probe.periodSeconds).toEqual(120);
        expect(probe.timeoutSeconds).toEqual(10);
        expect(probe.failureThreshold).toEqual(3);
    });

    it("defines a readinessProbe using exec", () => {
        const container = deployment.spec.template.spec.containers[0];
        let probe = container.readinessProbe;

        expect(probe).toBeDefined();
        expect(probe.exec).toBeDefined();
        expect(probe.exec.command).toEqual(["curl", "-f", "http://localhost"]);
        expect(probe.initialDelaySeconds).toEqual(5);
        expect(probe.periodSeconds).toEqual(120);
        expect(probe.timeoutSeconds).toEqual(10);
        expect(probe.failureThreshold).toEqual(3);
    });
});
