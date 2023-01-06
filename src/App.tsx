import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Code,
  Container,
  Flex,
  Heading,
  HStack,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Select,
  Stack,
  Switch,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  VscChevronRight,
  VscFolderOpened,
  VscGist,
  VscRepoPull,
  VscRunAll,
  VscTerminal,
} from "react-icons/vsc";
import useStorage from "use-local-storage-state";
import Editor from "@monaco-editor/react";
import { editor } from "monaco-editor/esm/vs/editor/editor.api";
import rustpadRaw from "../rustpad-server/src/rustpad.rs?raw";
import languages from "./languages.json";
import animals from "./animals.json";
import Rustpad, { UserInfo } from "./rustpad";
import useHash from "./useHash";
import ConnectionStatus from "./ConnectionStatus";
import Footer from "./Footer";
import User from "./User";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

function getWsUri(id: string) {
  return (
    (window.location.origin.startsWith("https") ? "wss://" : "ws://") +
    window.location.host +
    `/api/socket/${id}`
  );
}

function generateName() {
  return "Anonymous " + animals[Math.floor(Math.random() * animals.length)];
}

function generateHue() {
  return Math.floor(Math.random() * 360);
}

function App() {
  const toast = useToast();
  const [language, setLanguage] = useState("python");
  const [connection, setConnection] = useState<
    "connected" | "disconnected" | "desynchronized"
  >("disconnected");
  const [users, setUsers] = useState<Record<number, UserInfo>>({});
  const [name, setName] = useStorage("name", generateName);
  const [hue, setHue] = useStorage("hue", generateHue);
  const [editor, setEditor] = useState<editor.IStandaloneCodeEditor>();
  const [darkMode, setDarkMode] = useStorage("darkMode", () => false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [sidebarOpen, setSideBarOpen] = useState(true);
  const rustpad = useRef<Rustpad>();
  const rustpadValue = rustpad.current?.options.editor;
  const id = useHash();
  const queryClient = useQueryClient();

  const codeLogs = useQuery(
    ["codeLogs"],
    () =>
      axios
        .get("https://jsonplaceholder.typicode.com/posts/1")
        .then((res) => null),
    { refetchInterval: Infinity }
  );

  const runCodeMutation = useMutation(
    () =>
      axios
        .post("http://34.107.224.205/submit_code", {
          src_code: rustpadValue?.getValue()!,
        })
        .then((res) => res.data),
    {
      onError: (e) => {
        if (e instanceof Error) {
          console.error(e.message);
          toast({
            title: "An error occurred",
            description: (
              <>
                <Text as="span" fontWeight="semibold">
                  {e.message}
                </Text>
                .
              </>
            ),
            status: "error",
            duration: 2000,
            isClosable: true,
          });
        }
      },
      onSuccess: (data) => {
        toast({
          title: "Code runned",
          description: (
            <>
              <Text as="span" fontWeight="semibold">
                Code run successfully
              </Text>
              .
            </>
          ),
          status: "success",
          duration: 2000,
          isClosable: true,
        });
        setTerminalOpen(true);
        queryClient.setQueryData(["codeLogs"], data.output);
      },
    }
  );

  useEffect(() => {
    if (editor?.getModel()) {
      const model = editor.getModel()!;
      model.setValue("");
      model.setEOL(0); // LF
      rustpad.current = new Rustpad({
        uri: getWsUri(id),
        editor,
        onConnected: () => setConnection("connected"),
        onDisconnected: () => setConnection("disconnected"),
        onDesynchronized: () => {
          setConnection("desynchronized");
          toast({
            title: "Desynchronized with server",
            description: "Please save your work and refresh the page.",
            status: "error",
            duration: null,
          });
        },
        onChangeLanguage: (language) => {
          if (languages.includes(language)) {
            setLanguage(language);
          }
        },
        onChangeUsers: setUsers,
      });
      return () => {
        rustpad.current?.dispose();
        rustpad.current = undefined;
      };
    }
  }, [id, editor, toast, setUsers]);

  useEffect(() => {
    if (connection === "connected") {
      rustpad.current?.setInfo({ name, hue });
    }
    return () => {};
  }, [connection, name, hue]);

  function handleChangeLanguage(language: string) {
    setLanguage(language);
    if (rustpad.current?.setLanguage(language)) {
      toast({
        title: "Language updated",
        description: (
          <>
            All users are now editing in{" "}
            <Text as="span" fontWeight="semibold">
              {language}
            </Text>
            .
          </>
        ),
        status: "info",
        duration: 2000,
        isClosable: true,
      });
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}/#${id}`);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  }

  function handleLoadSample() {
    if (editor?.getModel()) {
      const model = editor.getModel()!;
      model.pushEditOperations(
        editor.getSelections(),
        [
          {
            range: model.getFullModelRange(),
            text: rustpadRaw,
          },
        ],
        () => null
      );
      editor.setPosition({ column: 0, lineNumber: 0 });
      if (language !== "rust") {
        handleChangeLanguage("rust");
      }
    }
  }

  function handleDarkMode() {
    setDarkMode(!darkMode);
  }

  return (
    <Flex
      direction="column"
      h="100vh"
      overflow="hidden"
      bgColor={darkMode ? "#1e1e1e" : "white"}
      color={darkMode ? "#cbcaca" : "inherit"}
    >
      <Box
        flexShrink={0}
        bgColor={darkMode ? "#333333" : "#e8e8e8"}
        color={darkMode ? "#cccccc" : "#383838"}
        textAlign="center"
        fontSize="sm"
        py={0.5}
        display="flex"
      >
        <Button
          size="xs"
          onClick={() => setSideBarOpen((p) => !p)}
          colorScheme={darkMode ? "whiteAlpha" : "blackAlpha"}
          borderColor={darkMode ? "green.400" : "purple.600"}
          color={darkMode ? "green.400" : "purple.600"}
          variant="outline"
        >
          {"</>"}
        </Button>
        <Box flex={1}>CodeBox</Box>
      </Box>
      <Flex flex="1 0" minH={0}>
        <>
          {sidebarOpen ? (
            <Container
              w="xs"
              bgColor={darkMode ? "#1e1e1e" : "#f3f3f3"}
              overflowY="auto"
              maxW="full"
              lineHeight={1.4}
              py={4}
            >
              <ConnectionStatus darkMode={darkMode} connection={connection} />
              <Flex justifyContent="space-between" mt={4} mb={1.5} w="full">
                <Heading size="sm">Dark Mode</Heading>
                <Switch isChecked={darkMode} onChange={handleDarkMode} />
              </Flex>
              <Heading mt={4} mb={1.5} size="sm">
                Language
              </Heading>
              <Select
                size="sm"
                bgColor={darkMode ? "#3c3c3c" : "white"}
                borderColor={darkMode ? "#3c3c3c" : "white"}
                value={language}
                onChange={(event) => handleChangeLanguage(event.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang} style={{ color: "black" }}>
                    {lang}
                  </option>
                ))}
              </Select>
              <Heading mt={4} mb={1.5} size="sm">
                Share Link
              </Heading>
              <InputGroup size="sm">
                <Input
                  readOnly
                  pr="3.5rem"
                  variant="outline"
                  bgColor={darkMode ? "#3c3c3c" : "white"}
                  borderColor={darkMode ? "#3c3c3c" : "white"}
                  value={`${window.location.origin}/#${id}`}
                />
                <InputRightElement width="3.5rem">
                  <Button
                    h="1.4rem"
                    size="xs"
                    onClick={handleCopy}
                    _hover={{ bg: darkMode ? "#575759" : "gray.200" }}
                    bgColor={darkMode ? "#575759" : "gray.200"}
                  >
                    Copy
                  </Button>
                </InputRightElement>
              </InputGroup>
              <Heading mt={4} mb={1.5} size="sm">
                Active Users
              </Heading>
              <Stack spacing={0} mb={1.5} fontSize="sm">
                <User
                  info={{ name, hue }}
                  isMe
                  onChangeName={(name) => name.length > 0 && setName(name)}
                  onChangeColor={() => setHue(generateHue())}
                  darkMode={darkMode}
                />
                {Object.entries(users).map(([id, info]) => (
                  <User key={id} info={info} darkMode={darkMode} />
                ))}
              </Stack>
              <Heading mt={4} mb={1.5} size="sm">
                About
              </Heading>
              <Text fontSize="sm" mb={1.5}>
                CodeBox lets you run code from your favorite programming
                language online.
              </Text>
              <Text fontSize="sm" mb={1.5}>
                Share a link to this pad with others, and they can edit from
                their browser while seeing your changes in real time.
              </Text>
              <Text fontSize="sm" mb={1.5}>
                Fork of <strong>Rustpad</strong>. See the{" "}
                <Link
                  color="blue.600"
                  fontWeight="semibold"
                  href="https://github.com/ekzhang/rustpad"
                  isExternal
                >
                  GitHub repository
                </Link>{" "}
                for details.
              </Text>
              <Flex direction="column" gap="0.5rem">
                <Button
                  size="sm"
                  colorScheme={darkMode ? "whiteAlpha" : "blackAlpha"}
                  borderColor={darkMode ? "purple.400" : "purple.600"}
                  color={darkMode ? "purple.400" : "purple.600"}
                  variant="outline"
                  leftIcon={<VscRepoPull />}
                  mt={1}
                  onClick={handleLoadSample}
                >
                  Read the code
                </Button>
                <Button
                  size="sm"
                  colorScheme={darkMode ? "whiteAlpha" : "blackAlpha"}
                  borderColor={darkMode ? "orange.400" : "purple.600"}
                  color={darkMode ? "orange.400" : "purple.600"}
                  variant="outline"
                  leftIcon={<VscTerminal />}
                  mt={1}
                  onClick={() => setTerminalOpen((p) => !p)}
                >
                  Toggle Terminal
                </Button>
                <Button
                  size="sm"
                  colorScheme={darkMode ? "whiteAlpha" : "blackAlpha"}
                  borderColor={darkMode ? "green.400" : "purple.600"}
                  color={darkMode ? "green.400" : "purple.600"}
                  variant="outline"
                  leftIcon={<VscRunAll />}
                  mt={1}
                  onClick={() => {
                    runCodeMutation.mutate();
                  }}
                >
                  Run Code
                </Button>
              </Flex>
            </Container>
          ) : null}
        </>
        <Flex flex={1} minW={0} h="100%" direction="column" overflow="hidden">
          <HStack
            h={6}
            spacing={1}
            color="#888888"
            fontWeight="medium"
            fontSize="13px"
            px={3.5}
            flexShrink={0}
          >
            <Icon as={VscFolderOpened} fontSize="md" color="blue.500" />
            <Text>documents</Text>
            <Icon as={VscChevronRight} fontSize="md" />
            <Icon as={VscGist} fontSize="md" color="purple.500" />
            <Text>{id}</Text>
          </HStack>
          <Box flex={1} minH={0}>
            <Editor
              theme={darkMode ? "vs-dark" : "vs"}
              language={language}
              options={{
                automaticLayout: true,
                fontSize: 18,
              }}
              onMount={(editor) => setEditor(editor)}
            />
          </Box>
          {terminalOpen ? (
            <Box
              display="flex"
              maxH="30%"
              h="30%"
              flexDirection="column"
              padding="0.5rem"
              bgColor={darkMode ? "#1e1e1e" : "#f3f3f3"}
              borderTop="4px"
              style={{ borderColor: darkMode ? "#131313" : "#d1d1d1" }}
            >
              <Text>Terminal Output</Text>
              {runCodeMutation.isLoading || codeLogs.isLoading ? (
                <Code
                  whiteSpace="pre"
                  width="full"
                  bgColor="transparent"
                  colorScheme={darkMode ? "whiteAlpha" : "blackAlpha"}
                >
                  Loading...
                </Code>
              ) : (
                <>
                  {codeLogs.data !== null ? (
                    <Code
                      whiteSpace="pre"
                      width="full"
                      bgColor="transparent"
                      colorScheme={darkMode ? "whiteAlpha" : "blackAlpha"}
                      overflowY="auto"
                    >
                      {codeLogs.data}
                    </Code>
                  ) : null}
                </>
              )}
            </Box>
          ) : null}
        </Flex>
      </Flex>
      <Footer />
    </Flex>
  );
}

export default App;
