const {getChartManifests, validateRequiredLabels} = require("./helpers");

let manifestObjects;

beforeAll(() => {
    manifestObjects = getChartManifests("simple");
});

it("generated two resources", () => {
    expect(manifestObjects.length).toBe(2);
    expect(manifestObjects.filter(o => o.kind === "Deployment").length).toBe(1);
    expect(manifestObjects.filter(o => o.kind === "ServiceAccount").length).toBe(1);
})

it("has all of the required labels", () => {
    validateRequiredLabels(manifestObjects);
});

describe("service account validations", () => {
    let serviceAccount;

    beforeAll(() => {
        serviceAccount = manifestObjects.find(o => o.kind === "ServiceAccount");
    });

    it("has the right name", () => {
        expect(serviceAccount.metadata.name).toEqual("deployment-nginx");
    });
});

describe("deployment validations", () => {
    let deployment;

    beforeAll(() => {
        deployment = manifestObjects.find(o => o.kind === "Deployment").props;
    });

    it("has the right name", () => {
        expect(deployment.metadata.name).toEqual("nginx");
    });

    it("has the right service account name", () => {
        expect(deployment.spec.template.spec.serviceAccountName).toEqual("deployment-nginx");
    });

    it("has the correct selector labels", () => {
        const matchLabels = deployment.spec.selector.matchLabels;
        expect(matchLabels["app.kubernetes.io/name"]).toBeDefined();
        expect(matchLabels["app.kubernetes.io/instance"]).toBeDefined();

        // Should match the service name
        expect(matchLabels["app.kubernetes.io/name"]).toEqual("nginx");
        expect(matchLabels["app.kubernetes.io/instance"]).toContain("test");
    });

    it("has a single container", () => {
        expect(deployment.spec.template.spec.containers.length).toBe(1);

        const container = deployment.spec.template.spec.containers[0];
        expect(container.name).toEqual("nginx");
        expect(container.image).toEqual("nginx:alpine");
    });
})