import { GitCommandGitProject } from "@atomist/automation-client/lib/project/git/GitCommandGitProject";
import { ProjectOperationCredentials } from "@atomist/automation-client/lib/operations/common/ProjectOperationCredentials";
import { GitHubRepoRef } from "@atomist/automation-client/lib/operations/common/GitHubRepoRef";
// extract out as well
import { findMatches } from "@atomist/automation-client/lib/tree/ast/astUtils";
import { JavaFileParser } from "@atomist/antlr/lib/tree/ast/antlr/java/JavaFileParser";
import * as fs from "fs-extra";

const main = async function () {

    const clientToken = await fs.readFile("github.token","utf8");

    // clone a repository
    const gitRepository = await GitCommandGitProject.cloned(
        {token: clientToken} as ProjectOperationCredentials,
        new GitHubRepoRef("timothysparg", "horseguards")
    );

    console.log(gitRepository.baseDir);

    // parse it with antlr grammer
    const m = await findMatches(gitRepository, JavaFileParser, "**/*.java",
        "//classDeclaration/Identifier[@value='HorseguardsResponse']");

    // open java file
    const target = m[0];
    const f = await gitRepository.findFile(target.sourceLocation.path);
    let c = await f.getContent();

    // make a change
    let commitMessage;
    if(c.includes("theStatusCode")){
        c = c.split("theStatusCode").join("statusCode");
        commitMessage = "changed 'theStatuscode' to 'statusCode'";;
    }else{
        c = c.split("statusCode").join("theStatusCode");
        commitMessage = "changed 'statuscode' to 'theStatusCode'";;
    }
    console.log(c);

    await f.setContent(c);
    await f.flush();

    //make a branch
    if (!await gitRepository.hasBranch("hello-world")){
        await gitRepository.createBranch("hello-world");
    }

    // make a commit
    await gitRepository.commit(commitMessage);
    console.log(await gitRepository.gitStatus());
    
    //push
    await gitRepository.push();

    // make a pull request
    await gitRepository.raisePullRequest("hello world", "from my use-respectory client");
    console.log("pause");
}

main();