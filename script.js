var canvas = document.getElementById("renderCanvas")

var engine = null
var scene = null
var sceneToRender = null
var createDefaultEngine = function () {
    return new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true
    })
}

console.log(`\n\n\n<!> new start\n\n\n`)

const blockSize = 1
const playerSize = 1.64;

const chunkWidth = 16
const chunkHeight = 16

const terrainTextureBlocksPerRow = 16

class Voxel {
    constructor({
        front = true,
        back = true,
        left = true,
        right = true,
        top = true,
        bottom = true
    } = {}) {
        this.front = front
        this.back = back
        this.left = left
        this.right = right
        this.top = top
        this.bottom = bottom
    }
}

class MeshData {
    constructor(positions = [], indices = [], normals = [], uvs = [], offset = 0) {
        this.positions = positions
        this.indices = indices
        this.normals = normals
        this.uvs = uvs
        this.offset = offset
    }
}

const frontFace = [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0]
const backFace = [0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 1]
const leftFace = [0, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1]
const rightFace = [1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 0]
const bottomFace = [0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0]
const topFace = [0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1]
const quadVertexSize = 4

const vertexIndeces = fo => {
    let o = fo * quadVertexSize
    return [o + 0, o + 1, o + 2, o + 3, o + 0, o + 2]
}

const offsetFacePosition = (face, position) => {
    return [
        face[0] + position.x,
        face[1] + position.y,
        face[2] + position.z,
        face[3] + position.x,
        face[4] + position.y,
        face[5] + position.z,
        face[6] + position.x,
        face[7] + position.y,
        face[8] + position.z,
        face[9] + position.x,
        face[10] + position.y,
        face[11] + position.z
    ]
}

function ChunkOffset(x, z) {
    this.x = x
    this.z = z
}

function UpdateChunk(chunk, scene, mat) {
    console.log(`updating chunk_${chunk.chunkOffset.x}_${chunk.chunkOffset.z}`)

    return CreateChunk(chunk.chunkOffset, scene, mat, chunk.chunkVoxels, chunk.mesh, chunk.vertexData, true)
}

function CreateChunk(chunkOffset, scene, mat, chunkVoxels = [], mesh = new BABYLON.Mesh(`chunk_${chunkOffset.x}_${chunkOffset.z}`, scene), vertexData = new BABYLON.VertexData(), update = false) {
    let chunkMesh = new MeshData()

    if (chunkVoxels.length == 0) {
        for (let x = 0; x < chunkWidth; x++) {
            for (let z = 0; z < chunkWidth; z++) {
                for (let y = 0; y < chunkHeight; y++) {
                    // let height = Math.floor(Math.random() * Math.floor(chunkHeight))
                    let height = 0

                    if (y > height)
                        break

                    chunkVoxels.push({
                        x: x,
                        y: y,
                        z: z,
                        blockID: Math.floor(Math.random() * Math.floor(3))
                    })
                }
            }
        }
    }

    // chunkVoxels.push({
    //     x: 8,
    //     y: 3,
    //     z: 8,
    //     blockID: 8
    // })

    let checkIfBlockExists = (pos, x, y, z) => {
        if (pos.x + x >= chunkWidth ||
            pos.x + x < 0 ||
            pos.z + z >= chunkWidth ||
            pos.z + z < 0 ||
            pos.y + y < 0) {
            return true
        }

        for (let voxel of chunkVoxels) {
            if (voxel.x == pos.x + x && voxel.y == pos.y + y && voxel.z == pos.z + z) {
                return true
            }
        }

        return false
    }

    for (let voxel of chunkVoxels) {
        let voxelData = new Voxel({
            front: !checkIfBlockExists(voxel, 0, 0, -1),
            back: !checkIfBlockExists(voxel, 0, 0, 1),
            left: !checkIfBlockExists(voxel, -1, 0, 0),
            right: !checkIfBlockExists(voxel, 1, 0, 0),
            top: !checkIfBlockExists(voxel, 0, 1, 0),
            bottom: !checkIfBlockExists(voxel, 0, -1, 0)
        })

        let addFace = (face, faceID = 0) => {
            chunkMesh.positions.push(...offsetFacePosition(face, {
                x: (chunkOffset.x * chunkWidth) + voxel.x,
                y: voxel.y,
                z: (chunkOffset.z * chunkWidth) + voxel.z
            }))
            chunkMesh.indices.push(...vertexIndeces(chunkMesh.offset))

            if (faceID == 0) {
                chunkMesh.uvs.push(...[
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                ])
            } else if (faceID == 1) {
                chunkMesh.uvs.push(...[
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                ])
            } else if (faceID == 2) {
                chunkMesh.uvs.push(...[
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                ])
            } else if (faceID == 3) {
                chunkMesh.uvs.push(...[
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - 1 / terrainTextureBlocksPerRow * (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) + 1),
                    ((voxel.blockID % terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                    (((voxel.blockID % terrainTextureBlocksPerRow) + 1) * 1 / terrainTextureBlocksPerRow), 1 - (((voxel.blockID - (voxel.blockID % terrainTextureBlocksPerRow)) / terrainTextureBlocksPerRow) * 1 / terrainTextureBlocksPerRow),
                ])
            }

            chunkMesh.offset++
        }

        if (voxelData.front) {
            addFace(frontFace, 2)
        }
        if (voxelData.back) {
            addFace(backFace, 1)
        }
        if (voxelData.left) {
            addFace(leftFace)
        }
        if (voxelData.right) {
            addFace(rightFace)
        }
        if (voxelData.bottom) {
            addFace(bottomFace)
        }
        if (voxelData.top) {
            addFace(topFace)
        }
    }

    BABYLON.VertexData.ComputeNormals(chunkMesh.positions, chunkMesh.indices, chunkMesh.normals);

    if (update) {
        mesh.updateVerticesData(vertexData.positions, chunkMesh.positions)
        mesh.updateVerticesData(vertexData.indices, chunkMesh.indices)
        mesh.updateVerticesData(vertexData.normals, chunkMesh.normals)
        mesh.updateVerticesData(vertexData.uvs, chunkMesh.uvs)
    }

    vertexData.positions = chunkMesh.positions
    vertexData.indices = chunkMesh.indices
    vertexData.normals = chunkMesh.normals
    vertexData.uvs = chunkMesh.uvs

    mesh.material = mat

    vertexData.applyToMesh(mesh, true)

    return {
        "chunkOffset": chunkOffset,
        "chunkVoxels": chunkVoxels,
        "mesh": mesh,
        "vertexData": vertexData
    }
}

var createScene = function () {
    var scene = new BABYLON.Scene(engine)
        scene.clearColor = new BABYLON.Color3(.5, .5, .5);
        scene.pointerLock = true
    var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(35, 15, 35), scene)
        camera.attachControl(canvas, true)
        camera.setTarget(BABYLON.Vector3.Zero())
        camera.keysUp.push(87)
        camera.keysDown.push(83)
        camera.keysLeft.push(65)
        camera.keysRight.push(68)
        camera.inertia = 0
        camera.speed = 0.8
        camera.angularSensibility = 1000
        // camera.maxZ = 50

    var light1 = new BABYLON.DirectionalLight("direct", new BABYLON.Vector3(0, -1, 1), scene).intensity = 1
    var light2 = new BABYLON.DirectionalLight("direct", new BABYLON.Vector3(0, -1, -1), scene).intensity = 1
    var light3 = new BABYLON.DirectionalLight("direct", new BABYLON.Vector3(1, 0, 0), scene).intensity = 0.5
    var light4 = new BABYLON.DirectionalLight("direct", new BABYLON.Vector3(-1, 0, 0), scene).intensity = 0.5

    var mat = new BABYLON.StandardMaterial("mat", scene)
        mat.diffuseTexture = new BABYLON.Texture("https://i.imgur.com/RJerGlg.png", scene, false, true, BABYLON.Texture.NEAREST_SAMPLINGMODE)
        mat.specularColor = new BABYLON.Color3(0, 0, 0)

    // Chunks generator
    let chunks = []
    for (var x = -1; x < 2; x++) {
        for (var z = -1; z < 2; z++) {
            chunks.push(new CreateChunk(new ChunkOffset(x, z), scene, mat))
        }
    }

    let chunkToUpdate = chunks.length - 1

    // Catch key press
    scene.onKeyboardObservable.add((kbInfo) => {
        if (kbInfo.event.key == 'r') {
            // Remove random block from chunk            
            chunks[chunkToUpdate].chunkVoxels.splice(Math.floor(Math.random() * Math.floor(chunks[chunkToUpdate].chunkVoxels.length - 1)), 1)
            
            // Update chunk
            chunks[chunkToUpdate] = UpdateChunk(chunks[chunkToUpdate], scene, mat)

            // console.log(chunks[chunkToUpdate])
        }
        if (kbInfo.event.key == 't') {
            chunkToUpdate = Math.floor(Math.random() * Math.floor(chunks.length))

            console.log(`chunkToUpdate ${chunkToUpdate}`)
        }
    })

    return scene
}

try {
    engine = createDefaultEngine()
} catch (e) {
    console.log("the available createEngine function failed. Creating the default engine instead")
    engine = createDefaultEngine()
}

if (!engine) throw 'engine should not be null.'

scene = createScene()
sceneToRender = scene

// Lock pointer
let createPointerLock = function (scene) {
    let canvas = scene.getEngine().getRenderingCanvas()

    canvas.addEventListener("click", event => {
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.msRequestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock

        if (canvas.requestPointerLock) {
            canvas.requestPointerLock()
        }
    }, false)
}
createPointerLock(scene)

// Scene render loop
engine.runRenderLoop(function () {
    if (sceneToRender) {
        sceneToRender.render()
    }
})

// Resize event
window.addEventListener("resize", function () {
    engine.resize();
})