const {getChartManifests, validateRequiredLabels} = require("./helpers");

let manifestObjects, deployment;

beforeAll(() => {
    manifestObjects = getChartManifests("volumes");
    deployment = manifestObjects.find(o => o.kind === "Deployment" && o.metadata.name === "app").props;
});

describe("PVC volume types", () => {
    describe("defaults", () => {
        it("created a PVC with default values", () => {
            const pvc = manifestObjects.find(o => o.kind === "PersistentVolumeClaim" && o.metadata.name === "pvcdefault").props;
            
            expect(pvc).toBeDefined();
            expect(pvc.spec.accessModes).toEqual(['ReadWriteOnce']);
            expect(pvc.spec.resources).toBeDefined();
            expect(pvc.spec.resources.requests).toBeDefined();
            expect(pvc.spec.resources.requests.storage).toEqual("10Gi");
        });
    
        it("gives the correct name for the pod volume", () => {
            const volume = deployment.spec.template.spec.volumes.find(v => v.name === "volume-1");
            
            expect(volume).toBeDefined();
            expect(volume.persistentVolumeClaim).toBeDefined();
            expect(volume.persistentVolumeClaim.claimName).toEqual("pvcdefault");
        });
    
        it("mounts the volume at the correct location", () => {
            const volumeMount = deployment.spec.template.spec.containers[0].volumeMounts.find(v => v.name === "volume-1");
            
            expect(volumeMount).toBeDefined();
            expect(volumeMount.mountPath).toEqual("/pvc-default");
        });
    });

    describe("overrides", () => {
        it("allows a PVC to specify its own name", () => {
            const pvc = manifestObjects.find(o => o.kind === "PersistentVolumeClaim" && o.metadata.name === "overridden-name").props;
            
            expect(pvc).toBeDefined();
            expect(pvc.spec.accessModes).toEqual(['ReadWriteOnce']);
            expect(pvc.spec.resources).toBeDefined();
            expect(pvc.spec.resources.requests).toBeDefined();
            expect(pvc.spec.resources.requests.storage).toBeDefined();
            expect(pvc.spec.resources.requests.storage).toEqual("10Gi");
        });
    
        it("gives the correct name for the pod volume when overriding the name", () => {
            const volume = deployment.spec.template.spec.volumes.find(v => v.name === "volume-2");
            
            expect(volume).toBeDefined();
            expect(volume.persistentVolumeClaim).toBeDefined();
            expect(volume.persistentVolumeClaim.claimName).toEqual("overridden-name");
        });
    
        it("mounts the volume at the correct location when using overriden names", () => {
            const volumeMount = deployment.spec.template.spec.containers[0].volumeMounts.find(v => v.name === "volume-2");
            
            expect(volumeMount).toBeDefined();
            expect(volumeMount.mountPath).toEqual("/custom-name");
        });
    
        it("allows a custom storage class to be defined", () => {
            const pvc = manifestObjects.find(o => o.kind === "PersistentVolumeClaim" && o.metadata.name === "custom-class").props;
    
            expect(pvc).toBeDefined();
            expect(pvc.spec.storageClassName).toBe("gp3");
        });
    
        it("allows a custom size to be defined", () => {
            const pvc = manifestObjects.find(o => o.kind === "PersistentVolumeClaim" && o.metadata.name === "custom-class").props;
    
            expect(pvc).toBeDefined();
            expect(pvc.spec.resources.requests.storage).toBe("50Gi");
        });
    });
});

describe("HostPath volume types", () => {
    it("defines a hostPath volume correctly", () => {
        const volume = deployment.spec.template.spec.volumes.find(v => v.name === "volume-3");

        expect(volume).toBeDefined();
        expect(volume.hostPath).toBeDefined();
        expect(volume.hostPath.path).toBe("/data");
    });

    it("mounts the volume in the container correctly", () => {
        const volumeMount = deployment.spec.template.spec.containers[0].volumeMounts.find(v => v.name === "volume-3");

        expect(volumeMount).toBeDefined();
        expect(volumeMount.mountPath).toBe("/host-data");
    });

    // Per the specification/best practices in K8s docs - https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
    it("mounts the volume as readonly", () => {
        const volumeMount = deployment.spec.template.spec.containers[0].volumeMounts.find(v => v.name === "volume-3");

        expect(volumeMount).toBeDefined();
        expect(volumeMount.readOnly).toBe(true);
    });
});
